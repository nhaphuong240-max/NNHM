import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import { CommissionSettlementService } from './commission-settlement.service';
import {
  shouldRunScheduledBatch,
  type SettlementScheduleConfig,
} from './commission-settlement-scheduler.util';

@Injectable()
export class CommissionSettlementSchedulerService {
  private readonly logger = new Logger(CommissionSettlementSchedulerService.name);

  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly settlement: CommissionSettlementService,
    private readonly audit: AuditService,
    private readonly tenantConfig: TenantConfigService,
  ) {}

  async getSchedule(tenantId: string) {
    const config = await this.loadConfig(tenantId);
    const lines = await this.settlement.listLines(tenantId, 'APPROVED');
    const readyCount = lines.meta.settlementReadyCount ?? 0;

    return {
      data: { ...config, readyCount },
      meta: { uc: ['UC-PAY-04'], screen: 'SCR-FIN-006', tenantId },
    };
  }

  async updateSchedule(
    tenantId: string,
    patch: Partial<SettlementScheduleConfig>,
    actorId?: string,
  ) {
    const current = await this.loadConfig(tenantId);
    const next: SettlementScheduleConfig = { ...current, ...patch };

    await this.tenantConfig.saveSettlementSchedule(tenantId, next, actorId, 'UPDATE');

    return this.getSchedule(tenantId);
  }

  /** UC-PAY-04 — run scheduled batch for tenant (called by cron job or manual trigger) */
  async runScheduledBatch(tenantId: string, actorId?: string | null) {
    const config = await this.loadConfig(tenantId);
    const lines = await this.settlement.listLines(tenantId, 'APPROVED');
    const readyCount = lines.meta.settlementReadyCount ?? 0;
    const gate = shouldRunScheduledBatch(config, readyCount);

    if (!gate.run) {
      const skipped: SettlementScheduleConfig = {
        ...config,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: 'SKIPPED',
        lastError: gate.reason,
      };
      await this.saveConfigSnapshot(tenantId, skipped, actorId);
      return {
        data: { skipped: true, reason: gate.reason, readyCount },
        meta: { uc: ['UC-PAY-04'], screen: 'SCR-FIN-006' },
      };
    }

    try {
      const result = await this.settlement.createRun(
        tenantId,
        { label: `Scheduled batch ${new Date().toISOString().slice(0, 10)}` },
        actorId ?? undefined,
      );
      const updated: SettlementScheduleConfig = {
        ...config,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: 'COMPLETED',
        lastRunId: result.data.id,
        lastError: undefined,
      };
      await this.saveConfigSnapshot(tenantId, updated, actorId);
      this.logger.log(`UC-PAY-04 scheduled settlement ${result.data.id} tenant=${tenantId}`);
      return {
        data: { skipped: false, run: result.data, entryCount: result.meta.entryCount },
        meta: { uc: ['UC-PAY-04'], screen: 'SCR-FIN-006' },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failed: SettlementScheduleConfig = {
        ...config,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: 'FAILED',
        lastError: message,
      };
      await this.saveConfigSnapshot(tenantId, failed, actorId);
      throw err;
    }
  }

  private async loadConfig(tenantId: string): Promise<SettlementScheduleConfig> {
    return this.tenantConfig.loadSettlementSchedule(tenantId);
  }

  private async saveConfigSnapshot(
    tenantId: string,
    config: SettlementScheduleConfig,
    actorId?: string | null,
  ) {
    await this.tenantConfig.saveSettlementSchedule(tenantId, config, actorId, 'RUN');
  }
}
