import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';
import { CrmHotSlaService } from './crm-hot-sla.service';

/** P0 §0.2(4) — auto-escalate HOT past due + notify leader (SMS sandbox). */
@Injectable()
export class CrmHotSlaEscalationJob {
  private readonly logger = new Logger(CrmHotSlaEscalationJob.name);

  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly hotSla: CrmHotSlaService,
    private readonly sms: SmsService,
  ) {}

  @Cron('*/60 * * * * *')
  async tick() {
    const now = new Date();
    const overdue = await this.leads
      .createQueryBuilder('l')
      .where('l.tier = :tier', { tier: 'HOT' })
      .andWhere('l.hot_sla_due_at IS NOT NULL')
      .andWhere('l.hot_sla_due_at <= :now', { now })
      .andWhere('l.first_touch_at IS NULL')
      .andWhere('l.hot_sla_breached = false')
      .take(20)
      .getMany();

    for (const lead of overdue) {
      await this.hotSla.escalateHotLead(
        lead.tenantId,
        lead.id,
        'system_sla_job',
        'auto_escalate_hot_sla',
      );
      await this.notifyLeader(lead.tenantId, lead.id);
    }
  }

  private async notifyLeader(tenantId: string, leadId: string) {
    const leaders = await this.users.find({
      where: { tenantId, role: 'DEVELOPER_ADMIN', isActive: true },
      take: 1,
    });
    const leader = leaders[0];
    if (!leader?.email) return;

    try {
      await this.sms.sendSms(tenantId, {
        templateId: SMS_TEMPLATES.TRANSACTION_NOTIFY,
        phone: '+84901234567',
        params: { message: `HOT lead ${leadId} quá SLA — đã escalate assignee` },
        source: { type: 'MANUAL', id: `sla_${leadId}` },
      });
    } catch {
      this.logger.debug(`SLA leader notify skipped (no SMS binding) tenant=${tenantId}`);
    }
  }
}
