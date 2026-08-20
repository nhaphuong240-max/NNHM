import { Injectable, Inject, UnprocessableEntityException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { MobileDeviceEntity } from '../../database/entities/mobile-device.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AgentWauService } from '../analytics/agent-wau.service';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import { ExpoPushService } from './expo-push.service';
import type {
  MobileDeviceRecord,
  PushStubInput,
  RegisterDeviceInput,
  SyncActivitiesInput,
} from './mobile-agent.types';

@Injectable()
export class MobileAgentService {
  private readonly syncedClientIds = new Set<string>();

  constructor(
    @InjectRepository(MobileDeviceEntity)
    private readonly devices: Repository<MobileDeviceEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @Inject(forwardRef(() => CrmService))
    private readonly crm: CrmService,
    private readonly wau: AgentWauService,
    private readonly config: ConfigService,
    private readonly expoPush: ExpoPushService,
    private readonly audit: AuditService,
  ) {}

  async registerDevice(
    tenantId: string,
    userId: string,
    input: RegisterDeviceInput,
  ): Promise<{ data: MobileDeviceRecord; meta: Record<string, unknown> }> {
    const pushToken = input.pushToken?.trim();
    if (!pushToken) {
      throw new UnprocessableEntityException({ detail: 'pushToken is required' });
    }

    const existing = await this.devices.findOne({ where: { tenantId, pushToken } });
    if (existing) {
      return {
        data: this.mapDevice(existing),
        meta: { uc: ['UC-UX-01'], screen: 'SCR-AGENT-MOBILE', mode: 'persisted', replay: true },
      };
    }

    const saved = await this.devices.save({
      id: `md_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      userId,
      pushToken,
      platform: input.platform ?? 'unknown',
      deviceName: input.deviceName?.trim() ?? null,
      appChannel: 'AGENT',
    });

    await this.wau.recordActivity({
      tenantId,
      userId,
      source: 'MOBILE',
      eventType: 'DEVICE_REGISTER',
      payload: { deviceId: saved.id },
    });

    return {
      data: this.mapDevice(saved),
      meta: {
        uc: ['UC-UX-01'],
        screen: 'SCR-AGENT-MOBILE',
        mode: (await this.expoPush.isLiveEnabled(tenantId)) ? 'push-live' : 'expo-stub',
      },
    };
  }

  async listDevices(tenantId: string, userId: string) {
    const rows = await this.devices.find({ where: { tenantId, userId } });
    return {
      data: rows.map((r) => this.mapDevice(r)),
      meta: { tenantId, count: rows.length, uc: ['UC-UX-01'], screen: 'SCR-AGENT-MOBILE' },
    };
  }

  async recordMobileActivity(
    tenantId: string,
    userId: string,
    eventType: string,
    payload?: Record<string, unknown>,
  ) {
    const normalized = eventType?.trim() || 'APP_SESSION';
    await this.wau.recordActivity({
      tenantId,
      userId,
      source: 'MOBILE',
      eventType: normalized,
      payload: payload ?? undefined,
    });

    return {
      data: {
        eventType: normalized,
        wauSimEnabled: this.config.get<string>('WAU_PILOT_SIM_ENABLED', 'false') === 'true',
      },
      meta: { tenantId, uc: ['T5-S2', 'UC-UX-01'], screen: 'SCR-AGENT-MOBILE' },
    };
  }

  async syncActivities(tenantId: string, userId: string, input: SyncActivitiesInput) {
    const items = input.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new UnprocessableEntityException({ detail: 'items array is required' });
    }
    if (items.length > 50) {
      throw new UnprocessableEntityException({ detail: 'max 50 items per sync batch' });
    }

    const synced: unknown[] = [];
    const failed: { clientRequestId: string; reason: string }[] = [];
    const skipped: string[] = [];

    for (const item of items) {
      const clientId = item.clientRequestId?.trim();
      if (!clientId) {
        failed.push({ clientRequestId: 'unknown', reason: 'clientRequestId_required' });
        continue;
      }
      if (this.syncedClientIds.has(`${tenantId}:${clientId}`)) {
        skipped.push(clientId);
        continue;
      }

      try {
        const result = await this.crm.createActivity(
          tenantId,
          {
            leadId: item.leadId,
            type: item.type,
            summary: item.summary,
            metadata: {
              ...(item.metadata ?? {}),
              clientRequestId: clientId,
              syncSource: 'mobile-offline-queue',
            },
          },
          userId,
        );
        this.syncedClientIds.add(`${tenantId}:${clientId}`);
        synced.push(result.data);
        await this.wau.recordActivity({
          tenantId,
          userId,
          source: 'MOBILE',
          eventType: 'ACTIVITY_SYNC',
          sessionId: clientId,
          payload: { leadId: item.leadId, type: item.type },
        });
      } catch (err) {
        const reason =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err && 'detail' in err
              ? String((err as { detail?: string }).detail)
              : 'sync_failed';
        failed.push({ clientRequestId: clientId, reason });
      }
    }

    return {
      data: { synced, failed, skipped },
      meta: { uc: ['UC-UX-01', 'UC-CRM-04'], screen: 'SCR-AGENT-MOBILE', count: items.length },
    };
  }

  async sendPushStub(tenantId: string, userId: string, input: PushStubInput) {
    const rows = await this.devices.find({ where: { tenantId, userId } });
    const title = input.title?.trim() || 'WEREAL Agent';
    const body =
      input.body?.trim() ||
      'Nhắc SLA: lead quá hạn follow-up — mở app để xử lý (UC-CRM-06).';
    const live = await this.expoPush.isLiveEnabled(tenantId);
    const pushData = input.data ?? { type: 'SLA_REMINDER', tenantId };

    if (rows.length === 0) {
      return {
        data: { sent: 0, deliveries: [], hint: 'Register push token from Profile tab first' },
        meta: { uc: ['UC-UX-01', 'UC-CRM-06'], screen: 'SCR-AGENT-MOBILE', mode: 'pilot-stub' },
      };
    }

    let tickets: Awaited<ReturnType<ExpoPushService['sendBatch']>> = [];
    if (live) {
      tickets = await this.expoPush.sendBatch(
        rows.map((device) => ({
          to: device.pushToken,
          title,
          body,
          data: pushData,
          sound: 'default' as const,
        })),
      );
    }

    const deliveries = rows.map((device, index) => {
      const ticket = tickets[index];
      const status = live
        ? ticket?.status === 'ok'
          ? ('SENT_LIVE' as const)
          : ('FAILED_LIVE' as const)
        : ('QUEUED_STUB' as const);
      return {
        deviceId: device.id,
        pushToken: device.pushToken.slice(0, 12) + '…',
        platform: device.platform,
        status,
        ticketId: ticket?.id,
        error: ticket?.status === 'error' ? ticket.message ?? ticket.details?.error : undefined,
        title,
        body,
        data: pushData,
      };
    });

    const sent = deliveries.filter((d) => d.status === 'SENT_LIVE' || d.status === 'QUEUED_STUB').length;

    await this.wau.recordActivity({
      tenantId,
      userId,
      source: 'MOBILE',
      eventType: 'PUSH_SENT',
      payload: { count: deliveries.length, live, sentLive: deliveries.filter((d) => d.status === 'SENT_LIVE').length },
    });

    return {
      data: { sent, deliveries },
      meta: {
        uc: ['UC-UX-01', 'UC-CRM-06', 'OP-WIN-09'],
        screen: 'SCR-AGENT-MOBILE',
        mode: live ? 'push-live' : 'pilot-stub',
      },
    };
  }

  /** OPS-S4-05 — push assigned agent (or pool) when new lead lands in inbox. */
  async notifyNewLead(
    tenantId: string,
    input: { leadId: string; fullName: string; source: string; assignedTo?: string | null },
  ) {
    const live = await this.expoPush.isLiveEnabled(tenantId);
    if (!live) {
      return {
        data: { sent: 0, skipped: true, reason: 'push_live_disabled' },
        meta: { uc: ['OPS-S4-05'], slaTargetSeconds: 300 },
      };
    }

    const agentIds = input.assignedTo
      ? [input.assignedTo]
      : (
          await this.users.find({
            where: { tenantId, role: 'AGENT', isActive: true },
            order: { createdAt: 'ASC' },
          })
        ).map((u) => u.id);

    if (agentIds.length === 0) {
      return {
        data: { sent: 0, skipped: true, reason: 'no_agents' },
        meta: { uc: ['OPS-S4-05'] },
      };
    }

    const devices = await this.devices.find({
      where: { tenantId, userId: In(agentIds) },
    });
    if (devices.length === 0) {
      return {
        data: { sent: 0, skipped: true, reason: 'no_devices', agentIds },
        meta: { uc: ['OPS-S4-05'] },
      };
    }

    const title = 'Lead mới · Inbox';
    const body = `${input.fullName} · ${input.source} — mở Inbox trong 5 phút`;
    const pushData = {
      type: 'NEW_LEAD',
      leadId: input.leadId,
      tenantId,
      source: input.source,
    };

    const tickets = await this.expoPush.sendBatch(
      devices.map((device) => ({
        to: device.pushToken,
        title,
        body,
        data: pushData,
        sound: 'default' as const,
      })),
    );

    const sent = tickets.filter((t) => t.status === 'ok').length;
    const notifiedAt = new Date().toISOString();

    await this.audit.append({
      tenantId,
      entityType: 'lead',
      entityId: input.leadId,
      action: 'LEAD_PUSH_SENT',
      payload: {
        source: input.source,
        assignedTo: input.assignedTo ?? null,
        deviceCount: devices.length,
        sent,
        notifiedAt,
        slaTargetSeconds: 300,
      },
      actorId: null,
    });

    return {
      data: {
        sent,
        notifiedAt,
        deviceCount: devices.length,
        leadId: input.leadId,
      },
      meta: { uc: ['OPS-S4-05'], mode: 'push-live', slaTargetSeconds: 300 },
    };
  }

  clearDevices() {
    this.syncedClientIds.clear();
  }

  private mapDevice(row: MobileDeviceEntity): MobileDeviceRecord {
    const platform = row.platform as MobileDeviceRecord['platform'];
    return {
      id: row.id,
      pushToken: row.pushToken,
      platform: platform === 'ios' || platform === 'android' ? platform : 'unknown',
      deviceName: row.deviceName,
      userId: row.userId,
      registeredAt: row.registeredAt.toISOString(),
    };
  }
}
