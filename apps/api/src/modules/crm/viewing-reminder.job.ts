import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ViewingEntity } from '../../database/entities/viewing.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { NotifyService } from '../notify/notify.service';

/** P1 FR-NOT-001b — T-2h viewing reminder with delivery log. */
@Injectable()
export class ViewingReminderJob {
  private readonly logger = new Logger(ViewingReminderJob.name);

  constructor(
    @InjectRepository(ViewingEntity)
    private readonly viewings: Repository<ViewingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    private readonly notify: NotifyService,
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
      const lead = await this.leads.findOne({ where: { id: row.leadId, tenantId: row.tenantId } });
      const agent = row.assignedTo
        ? await this.users.findOne({ where: { id: row.assignedTo } })
        : null;
      const phone = lead?.phone;
      if (phone) {
        await this.notify.sendToLead(row.tenantId, {
          leadId: row.leadId,
          phone,
          template: 'VIEWING_REMINDER',
          message: `Nhắc xem nhà lúc ${row.requestedSlot?.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} — agent ${agent?.email ?? 'NNHN'}`,
          sourceId: `vwr_${row.id}`,
        });
      } else {
        this.logger.debug(`Viewing reminder skipped — no phone ${row.id}`);
      }
      row.reminderSentAt = new Date();
      await this.viewings.save(row);
    }
  }
}
