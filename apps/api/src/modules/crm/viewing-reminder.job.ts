import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { SmsService } from '../sms/sms.service';
import { SMS_TEMPLATES } from '../sms/sms.types';

/** P0 §0.2(6) — T-2h viewing reminder (SMS sandbox). */
@Injectable()
export class ViewingReminderJob {
  private readonly logger = new Logger(ViewingReminderJob.name);

  constructor(
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly sms: SmsService,
  ) {}

  @Cron('*/5 * * * *')
  async tick() {
    const now = Date.now();
    const windowStart = new Date(now + 115 * 60 * 1000);
    const windowEnd = new Date(now + 125 * 60 * 1000);

    const rows = await this.viewings
      .createQueryBuilder('v')
      .where('v.status = :status', { status: 'CONFIRMED' })
      .andWhere('v.requested_slot IS NOT NULL')
      .andWhere('v.requested_slot BETWEEN :start AND :end', {
        start: windowStart,
        end: windowEnd,
      })
      .andWhere('v.reminder_sent_at IS NULL')
      .take(30)
      .getMany();

    for (const row of rows) {
      const agent = row.assignedTo
        ? await this.users.findOne({ where: { id: row.assignedTo } })
        : null;
      try {
        await this.sms.sendSms(row.tenantId, {
          templateId: SMS_TEMPLATES.TRANSACTION_NOTIFY,
          phone: '+84901234567',
          params: {
            message: `Nhắc xem nhà ${row.id} lúc ${row.requestedSlot?.toISOString()} — agent ${agent?.email ?? row.assignedTo}`,
          },
          source: { type: 'MANUAL', id: `vwr_${row.id}` },
        });
      } catch {
        this.logger.debug(`Viewing reminder sandbox log ${row.id}`);
      }
      row.reminderSentAt = new Date();
      await this.viewings.save(row);
    }
  }
}
