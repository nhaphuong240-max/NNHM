import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { LedgerEntryEntity } from '../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../database/entities/ledger-journal.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import {
  ReconciliationDiscrepancy,
  ReconciliationReportEntity,
} from '../../database/entities/reconciliation-report.entity';
import { PaymentWebhookEventEntity } from '../../database/entities/payment-webhook-event.entity';
import { ictDayRange, lastNDatesIct } from './reconciliation-date.util';
import type { ReconciliationRecord } from './reconciliation.types';
import { mapReconciliationReport } from './reconciliation.types';
import { ReconciliationAlertService } from './reconciliation-alert.service';
import {
  computeConsecutiveMatchedStreak,
  opWin02Passed,
} from './reconciliation-streak.util';

const CASH_ACCOUNTS = new Set(['CASH_MOCK', 'CASH_VNPAY']);

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconciliationReportEntity)
    private readonly reports: Repository<ReconciliationReportEntity>,
    @InjectRepository(PaymentWebhookEventEntity)
    private readonly webhooks: Repository<PaymentWebhookEventEntity>,
    @InjectRepository(LedgerJournalEntity)
    private readonly journals: Repository<LedgerJournalEntity>,
    @InjectRepository(LedgerEntryEntity)
    private readonly entries: Repository<LedgerEntryEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
    private readonly alerts: ReconciliationAlertService,
  ) {}

  async getReport(tenantId: string, date: string, refresh = false): Promise<ReconciliationRecord> {
    if (!refresh) {
      const cached = await this.reports.findOne({ where: { tenantId, reportDate: date } });
      if (cached) return mapReconciliationReport(cached);
    }

    const computed = await this.reconcileDay(tenantId, date);
    return mapReconciliationReport(computed);
  }

  async getReports(tenantId: string, days: number): Promise<ReconciliationRecord[]> {
    const limit = Math.min(Math.max(days, 1), 30);
    const dates = lastNDatesIct(limit).reverse();
    const results: ReconciliationRecord[] = [];

    for (const date of dates) {
      results.push(await this.getReport(tenantId, date));
    }

    return results;
  }

  /** P3-S3-01 — recompute reports for last N ICT days (staging smoke / OP-WIN-02 seed) */
  async refreshReports(tenantId: string, days: number): Promise<ReconciliationRecord[]> {
    const limit = Math.min(Math.max(days, 1), 30);
    const dates = lastNDatesIct(limit).reverse();
    const results: ReconciliationRecord[] = [];

    for (const date of dates) {
      const computed = await this.reconcileDay(tenantId, date);
      results.push(mapReconciliationReport(computed));
    }

    return results;
  }

  /** Compare gateway webhooks vs ledger journals for one ICT calendar day */
  async reconcileDay(tenantId: string, dateStr: string): Promise<ReconciliationReportEntity> {
    const { start, end } = ictDayRange(dateStr);

    const webhookRows = await this.webhooks
      .createQueryBuilder('w')
      .where('w.tenant_id = :tenantId', { tenantId })
      .andWhere('w.event_type = :eventType', { eventType: 'payment.success' })
      .andWhere('w.status = :status', { status: 'PROCESSED' })
      .andWhere('w.created_at >= :start AND w.created_at < :end', { start, end })
      .getMany();

    const journalRows = await this.journals
      .createQueryBuilder('j')
      .where('j.tenant_id = :tenantId', { tenantId })
      .andWhere('j.posted_at >= :start AND j.posted_at < :end', { start, end })
      .getMany();

    const journalByIntent = new Map(journalRows.map((j) => [j.paymentIntentId, j]));
    const discrepancies: ReconciliationDiscrepancy[] = [];
    let gatewayTotal = 0;

    for (const webhook of webhookRows) {
      const payloadAmount = Number((webhook.payload as { amount?: number } | null)?.amount ?? 0);
      const intent = await this.intents.findOne({ where: { id: webhook.paymentIntentId, tenantId } });
      const amount = payloadAmount > 0 ? payloadAmount : Number(intent?.amount ?? 0);
      gatewayTotal += amount;

      const journal = journalByIntent.get(webhook.paymentIntentId);
      if (!journal) {
        discrepancies.push({
          type: 'GATEWAY_ONLY',
          paymentIntentId: webhook.paymentIntentId,
          gatewayAmount: amount,
          detail: 'Gateway webhook success without ledger journal',
        });
        continue;
      }

      const ledgerAmount = await this.journalDebitTotal(journal.id);
      if (ledgerAmount !== amount) {
        discrepancies.push({
          type: 'AMOUNT_MISMATCH',
          paymentIntentId: webhook.paymentIntentId,
          journalId: journal.id,
          gatewayAmount: amount,
          ledgerAmount,
          detail: 'Gateway amount differs from ledger debit',
        });
      }

      journalByIntent.delete(webhook.paymentIntentId);
    }

    for (const [paymentIntentId, journal] of journalByIntent) {
      const ledgerAmount = await this.journalDebitTotal(journal.id);
      discrepancies.push({
        type: 'LEDGER_ONLY',
        paymentIntentId,
        journalId: journal.id,
        ledgerAmount,
        detail: 'Ledger journal without matching gateway webhook',
      });
    }

    let ledgerTotal = 0;
    for (const journal of journalRows) {
      ledgerTotal += await this.journalDebitTotal(journal.id);
    }

    const status =
      discrepancies.length === 0 && gatewayTotal === ledgerTotal ? 'MATCHED' : 'MISMATCH';

    const existing = await this.reports.findOne({ where: { tenantId, reportDate: dateStr } });
    const row: Partial<ReconciliationReportEntity> = {
      id: existing?.id ?? `rpt_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      reportDate: dateStr,
      status,
      gatewayTotal: String(gatewayTotal),
      ledgerTotal: String(ledgerTotal),
      gatewayCount: webhookRows.length,
      ledgerCount: journalRows.length,
      discrepancies,
    };

    const saved = await this.reports.save({ ...existing, ...row } as ReconciliationReportEntity);

    this.logger.log(
      `Reconciliation ${dateStr} tenant=${tenantId} status=${status} gateway=${gatewayTotal} ledger=${ledgerTotal}`,
    );

    if (status === 'MISMATCH') {
      await this.alerts.notifyMismatch(tenantId, saved);
    }

    return saved;
  }

  /** Per-intent instant reconcile after webhook (T4-S3) — idempotent */
  async reconcilePaymentEvent(
    tenantId: string,
    paymentIntentId: string,
  ): Promise<{ matched: boolean; paymentIntentId: string }> {
    const intent = await this.intents.findOne({
      where: { id: paymentIntentId, tenantId },
    });
    if (!intent) {
      return { matched: false, paymentIntentId };
    }

    const webhook = await this.webhooks.findOne({
      where: {
        tenantId,
        paymentIntentId,
        eventType: 'payment.success',
        status: 'PROCESSED',
      },
      order: { createdAt: 'DESC' },
    });
    if (!webhook) {
      return { matched: false, paymentIntentId };
    }

    const journal = await this.journals.findOne({
      where: { tenantId, paymentIntentId },
    });
    if (!journal) {
      return { matched: false, paymentIntentId };
    }

    const payloadAmount = Number((webhook.payload as { amount?: number } | null)?.amount ?? 0);
    const amount = payloadAmount > 0 ? payloadAmount : Number(intent.amount ?? 0);
    const ledgerAmount = await this.journalDebitTotal(journal.id);

    return {
      matched: ledgerAmount === amount,
      paymentIntentId,
    };
  }

  /** T4-S3 — live reconciliation snapshot for finance dashboard */
  async getLiveStatus(tenantId: string) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentWebhooks = await this.webhooks
      .createQueryBuilder('w')
      .where('w.tenant_id = :tenantId', { tenantId })
      .andWhere('w.created_at >= :since', { since: since24h })
      .orderBy('w.created_at', 'DESC')
      .take(20)
      .getMany();

    let mismatchCount = 0;
    for (const webhook of recentWebhooks.filter((w) => w.eventType === 'payment.success')) {
      const check = await this.reconcilePaymentEvent(tenantId, webhook.paymentIntentId);
      if (!check.matched) mismatchCount += 1;
    }

    const reports = await this.getReports(tenantId, 7);
    const streakRows = reports.map((r) => ({
      date: r.date,
      status: r.attributes.status,
    }));
    const consecutiveMatchedDays = computeConsecutiveMatchedStreak(streakRows);

    const lastEvent = recentWebhooks[0];

    return {
      tenantId,
      mismatchCount,
      consecutiveMatchedDays,
      opWin02Passed: opWin02Passed(consecutiveMatchedDays, 7),
      lastEventAt: lastEvent?.createdAt?.toISOString() ?? null,
      lastEventType: lastEvent?.eventType ?? null,
      checkedWebhooks24h: recentWebhooks.length,
    };
  }

  private async journalDebitTotal(journalId: string): Promise<number> {
    const lines = await this.entries.find({ where: { journalId } });
    return lines
      .filter((l) => l.side === 'DEBIT' && CASH_ACCOUNTS.has(l.account))
      .reduce((sum, l) => sum + Number(l.amount), 0);
  }
}
