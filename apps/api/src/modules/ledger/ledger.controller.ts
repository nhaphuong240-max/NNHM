import { Controller, Get, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ictToday } from './reconciliation-date.util';
import { ReconciliationService } from './reconciliation.service';
import {
  computeConsecutiveMatchedStreak,
  opWin02Passed,
} from './reconciliation-streak.util';
import { LedgerReconciliationJob } from './ledger-reconciliation.job';
import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly reconciliation: ReconciliationService,
    private readonly reconciliationJob: LedgerReconciliationJob,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.ledger.status();
  }

  /** API-065 GET /ledger/entries — FR-PAY-03, BR-18 */
  @Get('entries')
  listEntries(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('bookingId') bookingId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    return this.ledger.listEntries({
      tenantId: resolveTenantId(this.config, user, tenantHeader),
      bookingId: bookingId?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  /** API-066 GET /ledger/reconciliation — S4-04 daily gateway vs ledger */
  @Get('reconciliation')
  async getReconciliation(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('date') date?: string,
    @Query('days') daysRaw?: string,
    @Query('refresh') refreshRaw?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const refresh = refreshRaw === 'true';

    if (daysRaw) {
      const days = Number.parseInt(daysRaw, 10);
      const window = Number.isFinite(days) ? days : 7;
      const records = refresh
        ? await this.reconciliation.refreshReports(tenantId, window)
        : await this.reconciliation.getReports(tenantId, window);
      const matchedDays = records.filter((r) => r.attributes.status === 'MATCHED').length;
      const streakRows = records.map((r) => ({
        date: r.date,
        status: r.attributes.status,
      }));
      const consecutiveMatchedDays = computeConsecutiveMatchedStreak(streakRows);

      return {
        data: records,
        meta: {
          tenantId,
          matchedDays,
          totalDays: records.length,
          matchRate: records.length > 0 ? matchedDays / records.length : 1,
          consecutiveMatchedDays,
          opWin02Passed: opWin02Passed(consecutiveMatchedDays, window),
          source: 'postgres' as const,
        },
      };
    }

    const reportDate = date?.trim() || ictToday();
    const data = await this.reconciliation.getReport(tenantId, reportDate, refresh);

    return {
      data,
      meta: { tenantId, source: 'postgres' as const },
    };
  }

  /** T4-S3 — finance live reconciliation snapshot (SSE-friendly polling) */
  @Get('reconciliation/live')
  async getLiveReconciliation(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const data = await this.reconciliation.getLiveStatus(tenantId);
    return {
      data,
      meta: { tenantId, uc: ['UC-PAY-02', 'OP-WIN-02'], screen: 'SCR-FIN-002' },
    };
  }

  /** P3-S3-01 — manual trigger daily reconcile job (staging smoke) */
  @Post('reconciliation/run-daily')
  @HttpCode(200)
  async runDailyReconciliation(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    void user;
    void tenantHeader;
    const summary = await this.reconciliationJob.runDailyReconciliation();
    return {
      data: summary,
      meta: { uc: ['UC-PAY-02'], screen: 'SCR-FIN-002' },
    };
  }
}
