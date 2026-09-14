import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CrmNotifyDeliveryEntity } from '../../database/entities/crm-notify-delivery.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';

export type NotifyTemplate =
  | 'HOT_SLA_ESCALATE'
  | 'VIEWING_REMINDER'
  | 'HOLD_EXPIRY'
  | 'SAVED_SEARCH_ALERT';

/** P1 FR-NOT-001b — CRM notifications with delivery log + timeline hook. */
@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    @InjectRepository(CrmNotifyDeliveryEntity)
    private readonly deliveries: Repository<CrmNotifyDeliveryEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    private readonly sms: SmsService,
  ) {}

  async sendToLead(
    tenantId: string,
    input: {
      leadId?: string;
      phone: string;
      template: NotifyTemplate;
      message: string;
      sourceId: string;
    },
  ) {
    const id = `nd_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    let status: CrmNotifyDeliveryEntity['status'] = 'QUEUED';
    let externalId: string | null = null;
    let deliveredAt: Date | null = null;

    try {
      const result = await this.sms.sendSms(tenantId, {
        templateId: SMS_TEMPLATES.TRANSACTION_NOTIFY,
        phone: input.phone,
        params: { message: input.message },
        source: { type: 'MANUAL', id: input.sourceId },
      });
      status = result.status === 'DELIVERED' ? 'DELIVERED' : 'SENT';
      externalId = result.deliveryId ?? null;
      deliveredAt = status === 'DELIVERED' ? new Date() : null;
    } catch (e) {
      status = 'FAILED';
      this.logger.warn(`Notify failed ${input.template}: ${e instanceof Error ? e.message : e}`);
    }

    const row = await this.deliveries.save({
      id,
      tenantId,
      leadId: input.leadId ?? null,
      channel: 'SMS',
      templateId: input.template,
      phone: input.phone,
      status,
      externalId,
      payload: { message: input.message },
      deliveredAt,
    });
    return row;
  }

  async notifyLeadById(
    tenantId: string,
    leadId: string,
    template: NotifyTemplate,
    message: string,
    sourceId: string,
  ) {
    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead?.phone) return null;
    return this.sendToLead(tenantId, {
      leadId,
      phone: lead.phone,
      template,
      message,
      sourceId,
    });
  }

  async listForLead(tenantId: string, leadId: string) {
    const rows = await this.deliveries.find({
      where: { tenantId, leadId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        channel: r.channel,
        templateId: r.templateId,
        status: r.status,
        phone: r.phone.replace(/(\d{3})\d+(\d{2})/, '$1***$2'),
        createdAt: r.createdAt.toISOString(),
        deliveredAt: r.deliveredAt?.toISOString() ?? null,
      })),
      meta: { count: rows.length },
    };
  }

  async deliveryStats(tenantId: string) {
    const total = await this.deliveries.count({ where: { tenantId } });
    const delivered = await this.deliveries.count({ where: { tenantId, status: 'DELIVERED' } });
    return {
      total,
      delivered,
      rate: total ? delivered / total : null,
    };
  }
}
