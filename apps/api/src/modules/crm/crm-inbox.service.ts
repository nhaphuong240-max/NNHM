import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { AuditService } from '../audit/audit.service';
import { CrmInboxDeliveryService } from './crm-inbox-delivery.service';
import { buildInboxPreview, sortThreads, type InboxChannel, type InboxThread } from './crm-inbox.util';

@Injectable()
export class CrmInboxService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(CrmActivityEntity)
    private readonly activities: Repository<CrmActivityEntity>,
    @InjectRepository(MetaLeadEventEntity)
    private readonly metaEvents: Repository<MetaLeadEventEntity>,
    @InjectRepository(ZaloLeadEventEntity)
    private readonly zaloEvents: Repository<ZaloLeadEventEntity>,
    private readonly audit: AuditService,
    private readonly delivery: CrmInboxDeliveryService,
  ) {}

  async listThreads(tenantId: string) {
    const leadRows = await this.leads.find({ where: { tenantId }, take: 30, order: { updatedAt: 'DESC' } });
    const threads: InboxThread[] = [];

    for (const lead of leadRows) {
      const activity = await this.activities.findOne({
        where: { tenantId, leadId: lead.id },
        order: { createdAt: 'DESC' },
      });
      const meta = await this.metaEvents.findOne({
        where: { tenantId, leadId: lead.id },
        order: { createdAt: 'DESC' },
      });
      const zalo = await this.zaloEvents.findOne({
        where: { tenantId, leadId: lead.id },
        order: { createdAt: 'DESC' },
      });

      let channel: InboxChannel = 'WEB';
      let preview = lead.source ?? 'Lead mới từ portal';
      let lastAt = lead.updatedAt.toISOString();

      if (zalo) {
        channel = 'ZALO';
        preview = buildInboxPreview(`Zalo OA · ${zalo.msgId}`);
        lastAt = zalo.createdAt.toISOString();
      } else if (meta) {
        channel = 'META';
        preview = buildInboxPreview(`Meta Lead Ads · ${meta.leadgenId}`);
        lastAt = meta.createdAt.toISOString();
      } else if (activity) {
        channel = activity.type === 'ZALO' ? 'ZALO' : activity.type === 'CALL' ? 'CALL' : 'WEB';
        preview = buildInboxPreview(activity.summary ?? activity.type);
        lastAt = activity.createdAt.toISOString();
      }

      threads.push({
        id: `inb_${lead.id}`,
        leadId: lead.id,
        leadName: lead.fullName,
        channel,
        preview,
        unread: lead.status === 'NEW' || lead.status === 'CONTACTED',
        lastMessageAt: lastAt,
        status: lead.status,
      });
    }

    return {
      data: sortThreads(threads),
      meta: { tenantId, count: threads.length, uc: ['UC-CRM-07'], screen: 'SCR-AGENT-007', mode: 'production-inbox' },
    };
  }

  async reply(
    tenantId: string,
    threadId: string,
    input: { message: string; channel?: InboxChannel },
    actorId?: string,
  ) {
    const leadId = threadId.replace(/^inb_/, '');
    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead) {
      throw new NotFoundException({ detail: `Lead ${leadId} not found` });
    }

    const channel = input.channel ?? 'ZALO';
    const message = input.message.trim();
    const delivered = await this.delivery.deliver(tenantId, leadId, message, channel);

    const activityType = channel === 'ZALO' ? 'ZALO' : channel === 'CALL' ? 'CALL' : 'NOTE';
    const activityId = `act_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await this.activities.save({
      id: activityId,
      tenantId,
      leadId,
      type: activityType,
      summary: message.slice(0, 255),
      metadata: {
        direction: 'OUTBOUND',
        deliveryId: delivered.deliveryId,
        provider: delivered.provider,
        channel,
      },
      createdBy: actorId ?? null,
    });

    lead.lastActivityAt = new Date();
    lead.updatedAt = new Date();
    await this.leads.save(lead);

    await this.audit.append({
      tenantId,
      entityType: 'crm_inbox_reply',
      entityId: threadId,
      action: 'REPLY',
      payload: { leadId, channel, deliveryId: delivered.deliveryId, provider: delivered.provider },
      actorId: actorId ?? null,
    });

    return {
      data: {
        threadId,
        leadId,
        status: delivered.status,
        channel,
        deliveryId: delivered.deliveryId,
        provider: delivered.provider,
        sentAt: new Date().toISOString(),
      },
      meta: { uc: ['UC-CRM-07'], screen: 'SCR-AGENT-007', mode: 'production-inbox' },
    };
  }
}
