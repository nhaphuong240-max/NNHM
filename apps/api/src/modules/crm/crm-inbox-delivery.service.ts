import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';
import { ZaloGraphClient } from '../zalo/zalo-graph.client';
import type { InboxChannel } from './crm-inbox.util';

export type InboxDeliveryResult = {
  channel: InboxChannel;
  deliveryId: string;
  provider: string;
  status: 'SENT' | 'QUEUED' | 'SKIPPED';
};

@Injectable()
export class CrmInboxDeliveryService {
  private readonly logger = new Logger(CrmInboxDeliveryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly zalo: ZaloGraphClient,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
  ) {}

  async deliver(
    tenantId: string,
    leadId: string,
    message: string,
    channel: InboxChannel,
  ): Promise<InboxDeliveryResult> {
    const lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    if (!lead) {
      return {
        channel,
        deliveryId: `skip_${Date.now()}`,
        provider: 'none',
        status: 'SKIPPED',
      };
    }

    if (channel === 'SMS' || channel === 'CALL') {
      const result = await this.sms.sendSms(tenantId, {
        phone: lead.phone,
        templateId: SMS_TEMPLATES.TRANSACTION_NOTIFY,
        params: { message: message.slice(0, 160) },
        source: { type: 'MANUAL', id: `crm_inbox_${leadId}` },
      });
      return {
        channel,
        deliveryId: result.deliveryId,
        provider: result.sandbox ? 'sms-sandbox' : 'sms-live',
        status: 'SENT',
      };
    }

    if (channel === 'ZALO') {
      const sandbox = this.config.get<string>('ZALO_ZNS_SANDBOX', 'true') !== 'false';
      const accessToken = this.config.get<string>('ZALO_OA_ACCESS_TOKEN');
      if (!sandbox && accessToken) {
        try {
          const sent = await this.zalo.sendZnsTemplate({
            accessToken,
            phone: lead.phone,
            templateId: this.config.get<string>('ZALO_INBOX_TEMPLATE_ID', 'inbox_reply'),
            templateData: this.zalo.buildTemplateData('inbox_reply', {
              customer_name: lead.fullName,
              message: message.slice(0, 120),
            }),
            trackingId: `inbox_${leadId}_${Date.now()}`,
          });
          return {
            channel,
            deliveryId: sent.msgId,
            provider: 'zalo-zns-live',
            status: 'SENT',
          };
        } catch (err) {
          this.logger.warn(`Zalo inbox send failed: ${err instanceof Error ? err.message : err}`);
        }
      }
      return {
        channel,
        deliveryId: `zalo_sandbox_${Date.now()}`,
        provider: 'zalo-sandbox',
        status: 'QUEUED',
      };
    }

    return {
      channel,
      deliveryId: `web_${Date.now()}`,
      provider: 'crm-activity',
      status: 'SENT',
    };
  }
}
