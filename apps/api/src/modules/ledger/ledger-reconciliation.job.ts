import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { ScheduleLeaderService } from '../../infrastructure/redis/schedule-leader.service';
import { ictYesterday } from './reconciliation-date.util';
import { ReconciliationService } from './reconciliation.service';

export interface DailyReconciliationSummary {
  reportDate: string;
  tenants: Array<{ tenantId: string; status: string; reportId: string }>;
}

/** S4-04 / NFR-O03 — daily gateway vs ledger reconciliation at 06:00 ICT */
@Injectable()
export class LedgerReconciliationJob {
  private readonly logger = new Logger(LedgerReconciliationJob.name);

  constructor(
    private readonly reconciliation: ReconciliationService,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly scheduleLeader: ScheduleLeaderService,
  ) {}

  @Cron('0 0 6 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async handleCron(): Promise<void> {
    if (!(await this.scheduleLeader.isLeader('ledger-reconciliation', 3600))) return;
    await this.runDailyReconciliation();
  }

  /** P3-S3-01 — callable from cron or POST /ledger/reconciliation/run-daily */
  async runDailyReconciliation(): Promise<DailyReconciliationSummary> {
    const reportDate = ictYesterday();
    const tenantRows = await this.tenants.find({ where: { isActive: true } });
    const tenants: DailyReconciliationSummary['tenants'] = [];

    for (const tenant of tenantRows) {
      const report = await this.reconciliation.reconcileDay(tenant.id, reportDate);
      tenants.push({
        tenantId: tenant.id,
        status: report.status,
        reportId: report.id,
      });
      this.logger.log(
        `S4-04 daily job tenant=${tenant.id} date=${reportDate} status=${report.status}`,
      );
    }

    return { reportDate, tenants };
  }
}
