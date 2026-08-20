import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import { computeSlaMs, parseZaloEventTime } from '../portal/omnichannel-latency.util';
import { parseZaloLeadMessage } from './zalo-lead.parser';
import { ZaloGraphClient } from './zalo-graph.client';
import { ZaloTokenService } from './zalo-token.service';
import { verifyZaloWebhookSignature } from './zalo-signature.util';
import {
  ZALO_LEAD_EVENTS,
  ZALO_ZNS_TEMPLATES,
  type ZaloLeadChannelMeta,
  type ZaloWebhookPayload,
} from './zalo.types';

@Injectable()
export class ZaloLeadService {
  private readonly logger = new Logger(ZaloLeadService.name);

  constructor(
    @InjectRepository(ZaloLeadEventEntity)
    private readonly events: Repository<ZaloLeadEventEntity>,
    @InjectRepository(ZaloOaBindingEntity)
    private readonly oas: Repository<ZaloOaBindingEntity>,
    @InjectRepository(ZaloZnsDeliveryEntity)
    private readonly zns: Repository<ZaloZnsDeliveryEntity>,
    private readonly crm: CrmService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly graph: ZaloGraphClient,
    private readonly tokens: ZaloTokenService,
  ) {}

  status() {
    return {
      module: 'zalo-oa-zns',
      uc: 'UC-NW-01',
      rules: ['BR-05'],
      ac: 'AC-US-NW-01',
    };
  }

  assertSignature(payload: ZaloWebhookPayload, signature?: string) {
    const secret = this.config.get<string>('ZALO_OA_SECRET');
    const skip = this.config.get<string>('ZALO_WEBHOOK_SKIP_SIGNATURE') === 'true';
    if (!secret) {
      if (skip) return;
      this.logger.warn('ZALO_OA_SECRET not set — skipping signature verify (dev only)');
      return;
    }

    const appId = payload.app_id ?? '';
    const data = payload.message?.text ?? JSON.stringify(payload);
    const timestamp = payload.timestamp ?? '';
    if (!verifyZaloWebhookSignature(appId, data, timestamp, signature, secret)) {
      throw new UnauthorizedException({ detail: 'Invalid Zalo webhook signature' });
    }
  }

  async getIntegrationStatus(tenantId: string) {
    const [bindings, recentEvents, recentZns, processedCount, failedCount, znsSentCount, znsDeliveredCount] =
      await Promise.all([
        this.oas.find({ where: { tenantId, isActive: true } }),
        this.events.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 20,
        }),
        this.zns.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.events.count({ where: { tenantId, status: 'PROCESSED' } }),
        this.events.count({ where: { tenantId, status: 'FAILED' } }),
        this.zns.count({ where: { tenantId, status: 'SENT' } }),
        this.zns.count({ where: { tenantId, status: 'DELIVERED' } }),
      ]);

    const primaryBinding = bindings[0] ?? null;
    const graphMode = await this.tokens.graphMode(tenantId, primaryBinding);

    return {
      data: {
        channel: 'ZALO' as const,
        graphMode,
        oas: bindings.map((b) => ({
          id: b.id,
          oaId: b.oaId,
          oaName: b.oaName,
          isActive: b.isActive,
          hasToken: Boolean(b.accessToken || b.refreshToken),
          tokenExpiresAt: b.tokenExpiresAt?.toISOString() ?? null,
        })),
        templates: Object.values(ZALO_ZNS_TEMPLATES),
        stats: {
          leadsProcessed: processedCount,
          leadsFailed: failedCount,
          znsSent: znsSentCount,
          znsDelivered: znsDeliveredCount,
        },
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          msgId: e.msgId,
          oaId: e.oaId,
          status: e.status,
          leadId: e.leadId,
          createdAt: e.createdAt.toISOString(),
          lastError: e.lastError,
        })),
        recentZns: recentZns.map((d) => ({
          id: d.id,
          templateId: d.templateId,
          phone: d.phone,
          status: d.status,
          providerRef: d.providerRef,
          createdAt: d.createdAt.toISOString(),
        })),
      },
      meta: { tenantId },
    };
  }

  async handleWebhook(payload: ZaloWebhookPayload, signature?: string) {
    this.assertSignature(payload, signature);

    const eventName = payload.event_name?.trim();
    if (!eventName || !ZALO_LEAD_EVENTS.includes(eventName as (typeof ZALO_LEAD_EVENTS)[number])) {
      return { received: true, processed: 0, skipped: eventName ?? 'unknown' };
    }

    const result = await this.processInboundMessage(payload);
    return {
      received: true,
      processed: result.processed && !result.idempotentReplay ? 1 : 0,
      result,
    };
  }

  /** Admin sandbox — AC-US-NW-01 without Zalo Developer app */
  async simulateLead(
    tenantId: string,
    input: {
      oaId: string;
      msgId?: string;
      fullName?: string;
      phone?: string;
      message?: string;
    },
  ) {
    const binding = await this.oas.findOne({
      where: { tenantId, oaId: input.oaId, isActive: true },
    });
    if (!binding) {
      throw new NotFoundException({ detail: `Zalo OA ${input.oaId} not bound to tenant` });
    }

    const text =
      input.message?.trim() ??
      `Tên: ${input.fullName?.trim() || 'Lead Zalo Sandbox'}\nSĐT: ${input.phone?.trim() || '0901234567'}`;

    return this.processInboundMessage({
      app_id: this.config.get<string>('ZALO_APP_ID', 'zalo_app_dev'),
      event_name: 'user_send_text',
      timestamp: String(Math.floor(Date.now() / 1000)),
      oa_id: input.oaId,
      sender: { id: `sim_${randomUUID().replace(/-/g, '').slice(0, 8)}` },
      recipient: { id: input.oaId },
      message: {
        msg_id: input.msgId ?? `zmsg_sim_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        text,
      },
    });
  }

  /** ZNS outbound — sandbox stub or Zalo Graph API (P2 live) */
  async sendZns(
    tenantId: string,
    input: {
      templateId: string;
      phone: string;
      params?: Record<string, unknown>;
      source?: { type: 'MANUAL' | 'PAYMENT_SUCCESS'; id: string };
    },
  ) {
    if (input.source) {
      const existing = await this.zns.findOne({
        where: {
          tenantId,
          sourceType: input.source.type,
          sourceId: input.source.id,
        },
      });
      if (existing) {
        const binding = await this.oas.findOne({ where: { tenantId, isActive: true } });
        return {
          deliveryId: existing.id,
          status: existing.status,
          providerRef: existing.providerRef,
          sandbox: await this.tokens.isSandboxMode(tenantId),
          graphMode: await this.tokens.graphMode(tenantId, binding),
          idempotentReplay: true,
        };
      }
    }

    const binding = await this.oas.findOne({ where: { tenantId, isActive: true } });
    if (!binding) {
      throw new NotFoundException({ detail: 'No active Zalo OA binding for tenant' });
    }

    const deliveryId = `zns_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const sandbox = await this.tokens.isSandboxMode(tenantId);

    if (sandbox) {
      const row = await this.zns.save({
        id: deliveryId,
        tenantId,
        templateId: input.templateId,
        phone: input.phone.trim(),
        params: input.params ?? {},
        status: 'SENT',
        providerRef: `sandbox_${deliveryId}`,
        lastError: null,
        sourceType: input.source?.type ?? null,
        sourceId: input.source?.id ?? null,
      });

      await this.audit.append({
        tenantId,
        entityType: 'zalo_zns_delivery',
        entityId: row.id,
        action: 'ZALO_ZNS_SENT',
        payload: {
          templateId: row.templateId,
          phone: row.phone,
          sandbox: true,
          providerRef: row.providerRef,
        },
        actorId: null,
      });

      return {
        deliveryId: row.id,
        status: row.status,
        providerRef: row.providerRef,
        sandbox: true,
        graphMode: 'SANDBOX' as const,
      };
    }

    const accessToken = await this.tokens.getAccessToken(binding);
    const templateData = this.graph.buildTemplateData(input.templateId, input.params ?? {});

    let row: ZaloZnsDeliveryEntity = await this.zns.save({
      id: deliveryId,
      tenantId,
      templateId: input.templateId,
      phone: input.phone.trim(),
      params: templateData,
      status: 'QUEUED',
      providerRef: null,
      lastError: null,
      sourceType: input.source?.type ?? null,
      sourceId: input.source?.id ?? null,
    });

    try {
      const sent = await this.graph.sendZnsTemplate({
        accessToken,
        phone: input.phone.trim(),
        templateId: input.templateId,
        templateData,
        trackingId: deliveryId,
      });

      row.status = 'SENT';
      row.providerRef = sent.msgId;
      row = await this.zns.save(row);

      await this.audit.append({
        tenantId,
        entityType: 'zalo_zns_delivery',
        entityId: row.id,
        action: 'ZALO_ZNS_SENT',
        payload: {
          templateId: row.templateId,
          phone: row.phone,
          sandbox: false,
          providerRef: sent.msgId,
          sentTime: sent.sentTime,
        },
        actorId: null,
      });

      return {
        deliveryId: row.id,
        status: row.status,
        providerRef: row.providerRef,
        sandbox: false,
        graphMode: 'LIVE' as const,
      };
    } catch (err) {
      row.status = 'FAILED';
      row.lastError = err instanceof Error ? err.message : String(err);
      await this.zns.save(row);
      throw err;
    }
  }

  /** Delivery report webhook simulate (pilot) — UC-NW-01 staging DELIVERED */
  async markZnsDelivered(tenantId: string, deliveryId: string) {
    const row = await this.zns.findOne({ where: { id: deliveryId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `ZNS delivery ${deliveryId} not found` });
    }
    if (row.status === 'FAILED') {
      throw new UnprocessableEntityException({ detail: 'Cannot mark FAILED delivery as DELIVERED' });
    }
    row.status = 'DELIVERED';
    await this.zns.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'zalo_zns_delivery',
      entityId: row.id,
      action: 'ZALO_ZNS_DELIVERED',
      payload: { templateId: row.templateId, phone: row.phone, providerRef: row.providerRef },
      actorId: null,
    });

    return { deliveryId: row.id, status: row.status, providerRef: row.providerRef };
  }

  async connectOAuth(
    tenantId: string,
    input: { oaId: string; refreshToken: string; accessToken?: string; expiresIn?: number },
  ) {
    return this.tokens.connectTokens(tenantId, input.oaId, input);
  }

  async verifyOAuth(tenantId: string, oaId?: string) {
    const binding = await this.oas.findOne({
      where: { tenantId, oaId: oaId ?? 'oa_sunrise_dev', isActive: true },
    });
    if (!binding) {
      throw new NotFoundException({ detail: 'Zalo OA binding not found' });
    }
    return this.tokens.verifyConnection(tenantId, binding);
  }

  private async processInboundMessage(payload: ZaloWebhookPayload) {
    const msgId = payload.message?.msg_id?.trim();
    const oaId = (payload.oa_id ?? payload.recipient?.id)?.trim();
    const senderId = payload.sender?.id?.trim();
    const text = payload.message?.text?.trim();

    if (!msgId || !oaId || !senderId || !text) {
      throw new UnprocessableEntityException({
        detail: 'msg_id, oa_id/recipient.id, sender.id and message.text required',
      });
    }

    const existing = await this.events.findOne({ where: { msgId } });
    if (existing?.leadId) {
      return {
        msgId,
        leadId: existing.leadId,
        processed: true,
        idempotentReplay: true,
        status: existing.status,
      };
    }

    const binding = await this.oas.findOne({ where: { oaId, isActive: true } });
    if (!binding) {
      throw new NotFoundException({ detail: `Zalo OA ${oaId} is not connected` });
    }

    const eventId = `zle_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    let event: ZaloLeadEventEntity;

    try {
      event = await this.events.save({
        id: eventId,
        tenantId: binding.tenantId,
        msgId,
        oaId,
        status: 'PROCESSING',
        leadId: null,
        payload: payload as unknown as Record<string, unknown>,
        lastError: null,
      });
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const replay = await this.events.findOne({ where: { msgId } });
        if (replay?.leadId) {
          return {
            msgId,
            leadId: replay.leadId,
            processed: true,
            idempotentReplay: true,
            status: replay.status,
          };
        }
      }
      throw err;
    }

    try {
      const parsed = parseZaloLeadMessage(text, senderId);
      const channelMeta: ZaloLeadChannelMeta = {
        channel: 'ZALO',
        msgId,
        oaId,
        senderId,
        eventName: payload.event_name ?? 'user_send_text',
        appId: payload.app_id,
        rawText: text,
      };

      const leadResult = await this.crm.createLead(
        binding.tenantId,
        {
          fullName: parsed.fullName,
          phone: parsed.phone,
          message: parsed.message,
          source: 'ZALO_OA',
          consent: {
            privacyAccepted: true,
            privacyPolicyVersion: '2026-07-01',
            marketing: true,
          },
          utm: {
            utm_source: 'zalo',
            utm_medium: 'oa_message',
            utm_campaign: oaId,
          },
          channelMeta: { ...channelMeta },
        },
        `zalo:${msgId}`,
      );

      event.status = 'PROCESSED';
      event.leadId = leadResult.data.id;
      const processedAt = new Date();
      const channelAt = parseZaloEventTime(payload as unknown as Record<string, unknown>);
      const metrics = computeSlaMs(processedAt, event.createdAt, channelAt);
      event.processedAt = processedAt;
      event.ingestMs = metrics.ingestMs;
      event.slaMs = metrics.slaMs;
      await this.events.save(event);

      await this.audit.append({
        tenantId: binding.tenantId,
        entityType: 'zalo_lead_event',
        entityId: event.id,
        action: 'ZALO_LEAD_SYNCED',
        payload: {
          msgId,
          oaId,
          leadId: leadResult.data.id,
          senderId,
          idempotentReplay: leadResult.meta?.idempotentReplay ?? false,
          ingestMs: event.ingestMs,
          slaMs: event.slaMs,
        },
        actorId: null,
      });

      this.logger.log(`UC-NW-01 Zalo lead ${msgId} → ${leadResult.data.id}`);

      return {
        msgId,
        leadId: leadResult.data.id,
        processed: true,
        idempotentReplay: leadResult.meta?.idempotentReplay ?? false,
        status: 'PROCESSED' as const,
        tier: leadResult.data.attributes.tier,
        scoreStatus: leadResult.data.attributes.scoreStatus,
        ingestMs: event.ingestMs,
        slaMs: event.slaMs,
      };
    } catch (err) {
      event.status = 'FAILED';
      event.lastError = err instanceof Error ? err.message : String(err);
      await this.events.save(event);
      throw err;
    }
  }
}
