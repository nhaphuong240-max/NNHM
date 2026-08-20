import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { InventoryLockService } from '../../infrastructure/redis/inventory-lock.service';
import { ReconciliationService } from '../ledger/reconciliation.service';
import {
  OPS_DEEP_LINKS,
  OPS_RUNBOOK,
  type OpsConsoleSnapshot,
  type OpsWidget,
} from './ops.types';

const STUCK_AGE_MS = 15 * 60 * 1000;

@Injectable()
export class OpsService {
  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    private readonly locks: InventoryLockService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  async snapshot(tenantId: string): Promise<{ data: OpsConsoleSnapshot; meta: { tenantId: string; uc: string[] } }> {
    const [stuckPayments, lockTtl, driftBlock, reconcileMismatch] = await Promise.all([
      this.stuckPaymentsWidget(tenantId),
      this.lockTtlWidget(tenantId),
      this.driftBlockWidget(tenantId),
      this.reconcileWidget(tenantId),
    ]);

    const widgets = [stuckPayments, lockTtl, driftBlock, reconcileMismatch];
    return {
      data: {
        widgets,
        healthy: widgets.every((w) => w.severity === 'ok'),
      },
      meta: { tenantId, uc: ['OPS-S3-01'] },
    };
  }

  private severity(count: number): OpsWidget['severity'] {
    if (count <= 0) return 'ok';
    if (count < 3) return 'warn';
    return 'alert';
  }

  private async stuckPaymentsWidget(tenantId: string): Promise<OpsWidget> {
    const pending = await this.intents.find({
      where: { tenantId, status: 'PENDING' },
      take: 100,
      order: { createdAt: 'ASC' },
    });
    const now = Date.now();
    const stuck = pending.filter(
      (row) => row.expiresAt.getTime() <= now || now - row.createdAt.getTime() >= STUCK_AGE_MS,
    );
    return {
      id: 'stuckPayments',
      title: 'Stuck payment',
      count: stuck.length,
      severity: this.severity(stuck.length),
      hint: 'PENDING quá hạn TTL hoặc >15 phút chưa IPN',
      deepLink: OPS_DEEP_LINKS.stuckPayments,
      runbook: OPS_RUNBOOK,
      runbookAnchor: 'stuck-payment',
      items: stuck.slice(0, 8).map((row) => ({
        id: row.id,
        label: row.bookingId,
        detail: `expires ${row.expiresAt.toISOString()}`,
      })),
    };
  }

  private async lockTtlWidget(tenantId: string): Promise<OpsWidget> {
    const [metrics, active] = await Promise.all([
      this.locks.getMetrics(tenantId),
      this.locks.listActiveLocks(tenantId),
    ]);
    const expiring = active.filter((lock) => lock.ttlSeconds >= 0 && lock.ttlSeconds <= 120);
    const minTtl = active.reduce(
      (min, lock) => (lock.ttlSeconds >= 0 ? Math.min(min, lock.ttlSeconds) : min),
      Number.POSITIVE_INFINITY,
    );
    return {
      id: 'lockTtl',
      title: 'Lock TTL',
      count: expiring.length,
      severity: this.severity(expiring.length),
      hint: 'Redis unit lock còn ≤120s — sale sắp mất giữ chỗ',
      deepLink: OPS_DEEP_LINKS.lockTtl,
      runbook: OPS_RUNBOOK,
      runbookAnchor: 'lock-ttl',
      metrics: {
        acquired: metrics.acquired,
        contention: metrics.contention,
        active: active.length,
        minTtlSeconds: Number.isFinite(minTtl) ? minTtl : 0,
      },
      items: expiring.slice(0, 8).map((lock) => ({
        id: lock.unitId,
        label: lock.bookingId,
        detail: `TTL ${lock.ttlSeconds}s`,
      })),
    };
  }

  private async driftBlockWidget(tenantId: string): Promise<OpsWidget> {
    const rows = await this.listings.find({
      where: { tenantId, antiDriftStatus: 'BLOCK' },
      take: 20,
      order: { updatedAt: 'DESC' },
    });
    return {
      id: 'driftBlock',
      title: 'Drift BLOCK',
      count: rows.length,
      severity: this.severity(rows.length),
      hint: 'Listing giá/diện tích lệch GR — không approve',
      deepLink: OPS_DEEP_LINKS.driftBlock,
      runbook: OPS_RUNBOOK,
      runbookAnchor: 'drift-block',
      items: rows.slice(0, 8).map((row) => ({
        id: row.id,
        label: row.unitId,
        detail: row.title,
      })),
    };
  }

  private async reconcileWidget(tenantId: string): Promise<OpsWidget> {
    const reports = await this.reconciliation.getReports(tenantId, 7);
    const mismatch = reports.filter((row) => row.attributes.status !== 'MATCHED');
    const matched = reports.length - mismatch.length;
    return {
      id: 'reconcileMismatch',
      title: 'Reconcile mismatch',
      count: mismatch.length,
      severity: this.severity(mismatch.length),
      hint: `${matched}/${reports.length} ngày MATCHED (7 ngày ICT)`,
      deepLink: OPS_DEEP_LINKS.reconcileMismatch,
      runbook: OPS_RUNBOOK,
      runbookAnchor: 'reconcile-mismatch',
      metrics: {
        matchedDays: matched,
        totalDays: reports.length,
      },
      items: mismatch.slice(0, 8).map((row) => ({
        id: row.date,
        label: row.attributes.status,
        detail: row.date,
      })),
    };
  }
}
