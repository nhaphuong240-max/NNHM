import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { ScheduleLeaderService } from '../../infrastructure/redis/schedule-leader.service';
import { CommissionSettlementSchedulerService } from './commission-settlement-scheduler.service';

/** UC-PAY-04 · SCR-FIN-006 — weekly settlement batch (Mon 07:00 ICT) */
@Injectable()
export class CommissionSettlementJob {
  private readonly logger = new Logger(CommissionSettlementJob.name);

  constructor(
    private readonly scheduler: CommissionSettlementSchedulerService,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly scheduleLeader: ScheduleLeaderService,
  ) {}

  @Cron('0 7 * * 1', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runWeeklySettlement(): Promise<void> {
    if (!(await this.scheduleLeader.isLeader('commission-settlement', 3600))) return;
    const rows = await this.tenants.find({ where: { isActive: true } });
    for (const tenant of rows) {
      try {
        const result = await this.scheduler.runScheduledBatch(tenant.id, null);
        this.logger.log(
          `Settlement job tenant=${tenant.id} skipped=${Boolean(result.data.skipped)}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Settlement job failed tenant=${tenant.id}: ${message}`);
      }
    }
  }
}
