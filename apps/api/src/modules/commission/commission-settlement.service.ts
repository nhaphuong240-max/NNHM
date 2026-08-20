import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, IsNull, Repository } from 'typeorm';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import { CommissionSettlementRunEntity } from '../../database/entities/commission-settlement-run.entity';
import { CommissionSnapshotEntity } from '../../database/entities/commission-snapshot.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { KycService } from '../kyc/kyc.service';
import { CommissionPayoutClient } from './commission-payout.client';
import type {
  ApproveLinesInput,
  CreateSettlementRunInput,
  EntryRecord,
  SettlementRunRecord,
} from './commission.types';

async function mapEntryAsync(
  row: CommissionEntryEntity,
  kyc: KycService,
  tenantId: string,
  bookingId?: string,
): Promise<EntryRecord> {
  const kycInfo = await kyc.enrichEntry(tenantId, row);
  return {
    id: row.id,
    attributes: {
      snapshotId: row.snapshotId,
      bookingId,
      recipientType: row.recipientType,
      recipientId: row.recipientId,
      role: row.role,
      splitPercent: Number(row.splitPercent),
      amount: Number(row.amount),
      payoutStatus: row.payoutStatus,
      settlementRunId: row.settlementRunId ?? undefined,
      kycStatus: kycInfo.kycStatus,
      payoutEligible: kycInfo.payoutEligible,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

function mapRun(
  row: CommissionSettlementRunEntity,
  payout?: SettlementRunRecord['attributes']['payout'],
): SettlementRunRecord {
  return {
    id: row.id,
    attributes: {
      status: row.status,
      label: row.label ?? undefined,
      periodFrom: row.periodFrom ?? undefined,
      periodTo: row.periodTo ?? undefined,
      entryCount: row.entryCount,
      totalAmount: Number(row.totalAmount),
      createdBy: row.createdBy ?? undefined,
      completedAt: row.completedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      payout,
    },
  };
}

@Injectable()
export class CommissionSettlementService {
  constructor(
    @InjectRepository(CommissionEntryEntity)
    private readonly entries: Repository<CommissionEntryEntity>,
    @InjectRepository(CommissionSettlementRunEntity)
    private readonly runs: Repository<CommissionSettlementRunEntity>,
    @InjectRepository(CommissionSnapshotEntity)
    private readonly snapshots: Repository<CommissionSnapshotEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly kyc: KycService,
    private readonly audit: AuditService,
    private readonly payout: CommissionPayoutClient,
  ) {}

  status() {
    return {
      module: 'commission-settlement',
      ucs: ['UC-COM-03', 'UC-PAY-04', 'UC-COM-05', 'UC-ID-05'],
      rules: ['BR-23'],
      sprint: 'S5',
      payout: { note: 'Use GET /admin/config/rails/resolved for tenant-scoped payout rails' },
    };
  }

  async listLines(tenantId: string, payoutStatus?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (payoutStatus?.trim()) {
      where.payoutStatus = payoutStatus.trim();
    }

    const rows = await this.entries.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const snapshotIds = [...new Set(rows.map((r) => r.snapshotId))];
    const snapshots = snapshotIds.length
      ? await this.snapshots.find({ where: { tenantId, id: In(snapshotIds) } })
      : [];
    const bookingBySnapshot = new Map(snapshots.map((s) => [s.id, s.bookingId]));

    const data = await Promise.all(
      rows.map((row) => mapEntryAsync(row, this.kyc, tenantId, bookingBySnapshot.get(row.snapshotId))),
    );

    return {
      data,
      meta: {
        tenantId,
        count: rows.length,
        payableCount: data.filter((r) => r.attributes.payoutStatus === 'PENDING').length,
        approvedCount: data.filter((r) => r.attributes.payoutStatus === 'APPROVED').length,
        kycBlockedCount: data.filter((r) => !r.attributes.payoutEligible).length,
        settlementReadyCount: data.filter(
          (r) => r.attributes.payoutStatus === 'APPROVED' && r.attributes.payoutEligible,
        ).length,
      },
    };
  }

  /** UC-COM-03 + BR-23 — approve lines only when KYC verified */
  async approveLines(tenantId: string, input: ApproveLinesInput, actorId?: string) {
    const entryIds = [...new Set(input.entryIds ?? [])];
    if (entryIds.length === 0) {
      throw new UnprocessableEntityException({ detail: 'entryIds required' });
    }

    const rows = await this.entries.find({
      where: { tenantId, id: In(entryIds) },
    });

    if (rows.length !== entryIds.length) {
      throw new NotFoundException({ detail: 'One or more commission lines not found' });
    }

    const blocked = rows.filter((r) => r.payoutStatus !== 'PENDING');
    if (blocked.length > 0) {
      throw new UnprocessableEntityException({
        detail: `Lines must be PENDING to approve (${blocked.map((r) => r.id).join(', ')})`,
      });
    }

    await this.kyc.assertEntriesPayoutEligible(tenantId, rows);

    await this.entries.update({ tenantId, id: In(entryIds) }, { payoutStatus: 'APPROVED' });

    await this.audit.append({
      tenantId,
      entityType: 'commission_entry',
      entityId: entryIds.join(','),
      action: 'COMMISSION_LINES_APPROVED',
      payload: { entryIds, count: entryIds.length },
      actorId: actorId ?? null,
    });

    const updated = await this.entries.find({ where: { tenantId, id: In(entryIds) } });
    const snapshots = await this.snapshots.find({
      where: { tenantId, id: In([...new Set(updated.map((r) => r.snapshotId))]) },
    });
    const bookingBySnapshot = new Map(snapshots.map((s) => [s.id, s.bookingId]));

    const data = await Promise.all(
      updated.map((row) => mapEntryAsync(row, this.kyc, tenantId, bookingBySnapshot.get(row.snapshotId))),
    );

    return {
      data,
      meta: { approvedCount: data.length },
    };
  }

  async listRuns(tenantId: string) {
    const rows = await this.runs.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    const payoutMap = await this.loadPayoutMap(
      tenantId,
      rows.map((r) => r.id),
    );

    return {
      data: rows.map((row) =>
        mapRun(
          row,
          payoutMap.get(row.id) ??
            (row.status === 'FAILED' ? { status: 'FAILED' as const } : undefined),
        ),
      ),
      meta: { tenantId, count: rows.length },
    };
  }

  async getRun(tenantId: string, runId: string) {
    const run = await this.runs.findOne({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException({ detail: `Settlement run ${runId} not found` });

    const payoutMap = await this.loadPayoutMap(tenantId, [runId]);
    const payout =
      payoutMap.get(runId) ?? (run.status === 'FAILED' ? { status: 'FAILED' as const } : undefined);

    const entryRows = await this.entries.find({
      where: { tenantId, settlementRunId: runId },
      order: { createdAt: 'ASC' },
    });

    const snapshotIds = [...new Set(entryRows.map((r) => r.snapshotId))];
    const snapshots = snapshotIds.length
      ? await this.snapshots.find({ where: { tenantId, id: In(snapshotIds) } })
      : [];
    const bookingBySnapshot = new Map(snapshots.map((s) => [s.id, s.bookingId]));

    const entries = await Promise.all(
      entryRows.map((row) => mapEntryAsync(row, this.kyc, tenantId, bookingBySnapshot.get(row.snapshotId))),
    );

    return {
      data: mapRun(run, payout),
      entries,
      meta: { entryCount: entries.length },
    };
  }

  /** UC-PAY-04 + BR-23 — batch settlement only for KYC-verified recipients */
  async createRun(tenantId: string, input: CreateSettlementRunInput, actorId?: string) {
    let candidates: CommissionEntryEntity[];

    if (input.entryIds?.length) {
      candidates = await this.entries.find({
        where: {
          tenantId,
          id: In(input.entryIds),
          payoutStatus: 'APPROVED',
          settlementRunId: IsNull(),
        },
      });
      if (candidates.length !== input.entryIds.length) {
        throw new UnprocessableEntityException({
          detail: 'All entryIds must be APPROVED and not yet settled',
        });
      }
    } else {
      candidates = await this.entries.find({
        where: {
          tenantId,
          payoutStatus: 'APPROVED',
          settlementRunId: IsNull(),
        },
        order: { createdAt: 'ASC' },
      });
    }

    if (input.periodFrom) {
      const from = new Date(`${input.periodFrom}T00:00:00.000Z`);
      candidates = candidates.filter((e) => e.createdAt >= from);
    }
    if (input.periodTo) {
      const to = new Date(`${input.periodTo}T23:59:59.999Z`);
      candidates = candidates.filter((e) => e.createdAt <= to);
    }

    if (candidates.length === 0) {
      throw new UnprocessableEntityException({
        detail: 'No APPROVED commission lines available for settlement',
      });
    }

    await this.kyc.assertEntriesPayoutEligible(tenantId, candidates);

    const totalAmount = candidates.reduce((sum, e) => sum + Number(e.amount), 0);
    const runId = `sr_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

    const run: CommissionSettlementRunEntity = await this.runs.save({
      id: runId,
      tenantId,
      status: 'PENDING',
      label: input.label?.trim() || `Settlement ${new Date().toISOString().slice(0, 10)}`,
      periodFrom: input.periodFrom ?? null,
      periodTo: input.periodTo ?? null,
      entryCount: candidates.length,
      totalAmount: String(totalAmount),
      createdBy: actorId ?? null,
      completedAt: null,
      lastError: null,
    });

    const entryIds = candidates.map((e) => e.id);
    await this.entries.update(
      { tenantId, id: In(entryIds) },
      { settlementRunId: runId },
    );

    try {
      const payoutResult = await this.payout.submitBatch({
        tenantId,
        runId,
        lines: candidates.map((e) => ({
          entryId: e.id,
          recipientId: e.recipientId,
          amount: Number(e.amount),
        })),
      });

      const payoutEnabled = await this.payout.isEnabled(tenantId);
      const payoutStub = await this.payout.isStubMode(tenantId);
      const awaitBankConfirm =
        payoutEnabled && !payoutStub && payoutResult.status === 'SUBMITTED';

      if (awaitBankConfirm) {
        run.status = 'SUBMITTED';
        await this.runs.save(run);

        await this.audit.append({
          tenantId,
          entityType: 'commission_settlement_run',
          entityId: runId,
          action: 'SETTLEMENT_RUN_SUBMITTED',
          payload: {
            entryIds,
            entryCount: candidates.length,
            totalAmount,
            periodFrom: input.periodFrom,
            periodTo: input.periodTo,
            payout: payoutResult,
          },
          actorId: actorId ?? null,
        });

        return this.getRun(tenantId, runId);
      }

      await this.entries.update(
        { tenantId, id: In(entryIds) },
        { payoutStatus: 'PAID' },
      );

      run.status = 'COMPLETED';
      run.completedAt = new Date();
      await this.runs.save(run);

      await this.markSnapshotsPaid(tenantId, [...new Set(candidates.map((c) => c.snapshotId))]);

      await this.audit.append({
        tenantId,
        entityType: 'commission_settlement_run',
        entityId: runId,
        action: 'SETTLEMENT_RUN_COMPLETED',
        payload: {
          entryIds,
          entryCount: candidates.length,
          totalAmount,
          periodFrom: input.periodFrom,
          periodTo: input.periodTo,
          payout: payoutResult,
        },
        actorId: actorId ?? null,
      });

      return this.getRun(tenantId, runId);
    } catch (err) {
      run.status = 'FAILED';
      run.lastError = err instanceof Error ? err.message : String(err);
      await this.runs.save(run);
      throw err;
    }
  }

  /** OPS-S5-01 — bank webhook confirms live payout batch → PAID */
  async confirmPayoutFromBankWebhook(
    tenantId: string,
    input: {
      settlementRunId?: string;
      batchId: string;
      amount: number;
      status: 'SUCCESS' | 'FAILED' | 'SUBMITTED';
    },
  ) {
    if (input.status !== 'SUCCESS') {
      return {
        accepted: true,
        completed: false,
        reason: `Payout webhook status ${input.status} — no state change`,
      };
    }

    let runId = input.settlementRunId?.trim();
    if (!runId && input.batchId.startsWith('pay_')) {
      runId = input.batchId.slice(4);
    }
    if (!runId) {
      return { accepted: false, completed: false, reason: 'settlementRunId or pay_* batchId required' };
    }

    const run = await this.runs.findOne({ where: { id: runId, tenantId } });
    if (!run) {
      return { accepted: false, completed: false, reason: `Settlement run ${runId} not found` };
    }
    if (run.status === 'COMPLETED') {
      return { accepted: true, completed: true, runId, idempotent: true };
    }
    if (run.status !== 'SUBMITTED') {
      return {
        accepted: false,
        completed: false,
        reason: `Run ${runId} must be SUBMITTED (current ${run.status})`,
      };
    }

    const expectedBatchId = `pay_${runId}`;
    if (input.batchId !== expectedBatchId) {
      return {
        accepted: false,
        completed: false,
        reason: `Batch mismatch: expected ${expectedBatchId}, got ${input.batchId}`,
      };
    }

    const entryRows = await this.entries.find({
      where: { tenantId, settlementRunId: runId },
    });
    const entryIds = entryRows.map((e) => e.id);

    await this.entries.update({ tenantId, id: In(entryIds) }, { payoutStatus: 'PAID' });

    run.status = 'COMPLETED';
    run.completedAt = new Date();
    await this.runs.save(run);

    await this.markSnapshotsPaid(tenantId, [...new Set(entryRows.map((c) => c.snapshotId))]);

    await this.audit.append({
      tenantId,
      entityType: 'commission_settlement_run',
      entityId: runId,
      action: 'SETTLEMENT_RUN_COMPLETED',
      payload: {
        entryIds,
        entryCount: entryRows.length,
        totalAmount: Number(run.totalAmount),
        payout: {
          batchId: input.batchId,
          status: 'SUBMITTED',
          provider: 'partner-payout',
          bankAmount: input.amount,
          confirmedVia: 'bank-webhook',
        },
      },
      actorId: null,
    });

    return {
      accepted: true,
      completed: true,
      runId,
      batchId: input.batchId,
      entryCount: entryRows.length,
      totalAmount: Number(run.totalAmount),
    };
  }

  /** OPS-S5-05 — reconcile payout batch total vs bank statement line */
  async reconcilePayoutBatch(
    tenantId: string,
    runId: string,
    input: { batchId: string; bankAmount: number },
  ) {
    const run = await this.runs.findOne({ where: { id: runId, tenantId } });
    if (!run) {
      throw new NotFoundException({ detail: `Settlement run ${runId} not found` });
    }

    const expectedBatchId = `pay_${runId}`;
    const expectedAmount = Number(run.totalAmount);
    const batchMatched = input.batchId.trim() === expectedBatchId;
    const amountMatched = input.bankAmount === expectedAmount;

    const result = {
      runId,
      batchId: input.batchId,
      expectedBatchId,
      expectedAmount,
      bankAmount: input.bankAmount,
      delta: input.bankAmount - expectedAmount,
      batchMatched,
      amountMatched,
      status: batchMatched && amountMatched ? ('MATCHED' as const) : ('MISMATCH' as const),
    };

    await this.audit.append({
      tenantId,
      entityType: 'commission_settlement_run',
      entityId: runId,
      action: 'PAYOUT_BATCH_RECONCILED',
      payload: result,
      actorId: null,
    });

    return { data: result, meta: { uc: 'G-OPS-2', sprint: 'S5' } };
  }

  private async markSnapshotsPaid(tenantId: string, snapshotIds: string[]) {
    for (const snapshotId of snapshotIds) {
      const pending = await this.entries.count({
        where: {
          tenantId,
          snapshotId,
          payoutStatus: In(['PENDING', 'APPROVED', 'HOLDBACK']),
        },
      });
      if (pending === 0) {
        const snapshot = await this.snapshots.findOne({ where: { id: snapshotId, tenantId } });
        if (snapshot && snapshot.status !== 'PAID') {
          snapshot.status = 'PAID';
          await this.snapshots.save(snapshot);
        }
      }
    }
  }

  private async loadPayoutMap(tenantId: string, runIds: string[]) {
    const map = new Map<string, SettlementRunRecord['attributes']['payout']>();
    if (!runIds.length) return map;

    const rows = await this.auditEvents.find({
      where: {
        tenantId,
        entityType: 'commission_settlement_run',
        action: In(['SETTLEMENT_RUN_COMPLETED', 'SETTLEMENT_RUN_SUBMITTED']),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    for (const row of rows) {
      if (!runIds.includes(row.entityId)) continue;
      const payload = row.payload as {
        payout?: { status?: 'SUBMITTED' | 'SKIPPED'; batchId?: string; provider?: string };
      };
      if (payload.payout?.status) {
        map.set(row.entityId, {
          status: payload.payout.status,
          batchId: payload.payout.batchId,
          provider: payload.payout.provider,
        });
      }
    }

    return map;
  }
}
