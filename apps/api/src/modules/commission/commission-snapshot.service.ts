import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CommissionDisputeEntity } from '../../database/entities/commission-dispute.entity';
import { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import { CommissionSnapshotEntity } from '../../database/entities/commission-snapshot.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { CommissionPolicyService } from './commission-policy.service';
import type {
  DisputeRecord,
  EntryRecord,
  OpenHoldbackInput,
  SnapshotRecord,
} from './commission.types';
import {
  calculateCommissionAmount,
  hashPolicySnapshot,
  recipientTypeForRole,
} from './commission.util';

function mapSnapshot(row: CommissionSnapshotEntity): SnapshotRecord {
  return {
    id: row.id,
    attributes: {
      bookingId: row.bookingId,
      policyId: row.policyId,
      policyVersion: row.policyVersion,
      policyHash: row.policyHash,
      dealAmount: Number(row.dealAmount),
      totalCommission: Number(row.totalCommission),
      status: row.status,
      calculatedAt: row.calculatedAt.toISOString(),
    },
  };
}

function mapEntry(row: CommissionEntryEntity): EntryRecord {
  return {
    id: row.id,
    attributes: {
      snapshotId: row.snapshotId,
      recipientType: row.recipientType,
      recipientId: row.recipientId,
      role: row.role,
      splitPercent: Number(row.splitPercent),
      amount: Number(row.amount),
      payoutStatus: row.payoutStatus,
    },
  };
}

function mapDispute(row: CommissionDisputeEntity): DisputeRecord {
  return {
    id: row.id,
    attributes: {
      snapshotId: row.snapshotId,
      reason: row.reason,
      status: row.status,
      holdbackPercent: Number(row.holdbackPercent),
      openedAt: row.openedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString(),
    },
  };
}

@Injectable()
export class CommissionSnapshotService {
  constructor(
    @InjectRepository(CommissionSnapshotEntity)
    private readonly snapshots: Repository<CommissionSnapshotEntity>,
    @InjectRepository(CommissionEntryEntity)
    private readonly entries: Repository<CommissionEntryEntity>,
    @InjectRepository(CommissionDisputeEntity)
    private readonly disputes: Repository<CommissionDisputeEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly policies: CommissionPolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, bookingId?: string) {
    const where: Record<string, string> = { tenantId };
    if (bookingId) where.bookingId = bookingId;

    const rows = await this.snapshots.find({
      where,
      order: { calculatedAt: 'DESC' },
    });

    return { data: rows.map(mapSnapshot), meta: { tenantId, count: rows.length } };
  }

  /** UC-COM-04 — list holdback disputes for ops console */
  async listDisputes(tenantId: string, status?: string) {
    const where: { tenantId: string; status?: CommissionDisputeEntity['status'] } = { tenantId };
    const trimmed = status?.trim().toUpperCase();
    if (trimmed === 'OPEN' || trimmed === 'RESOLVED') {
      where.status = trimmed;
    }

    const rows = await this.disputes.find({
      where,
      order: { openedAt: 'DESC' },
    });

    const data: DisputeRecord[] = await Promise.all(
      rows.map(async (row) => {
        const snap = await this.snapshots.findOne({
          where: { id: row.snapshotId, tenantId },
        });
        return {
          ...mapDispute(row),
          attributes: {
            ...mapDispute(row).attributes,
            bookingId: snap?.bookingId,
          },
        };
      }),
    );

    return { data, meta: { tenantId, count: data.length, status: trimmed ?? null } };
  }

  async get(tenantId: string, snapshotId: string) {
    const row = await this.snapshots.findOne({ where: { id: snapshotId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Snapshot ${snapshotId} not found` });

    const entryRows = await this.entries.find({ where: { snapshotId: row.id, tenantId } });
    const disputeRows = await this.disputes.find({ where: { snapshotId: row.id, tenantId } });

    return {
      data: mapSnapshot(row),
      entries: entryRows.map(mapEntry),
      disputes: disputeRows.map(mapDispute),
      meta: {
        splitTotalPercent: entryRows.reduce((sum, e) => sum + Number(e.splitPercent), 0),
        payoutBlocked: row.status === 'HOLDBACK',
      },
    };
  }

  /** UC-COM-02 + UC-COM-03 — snapshot + split lines on deal close */
  async closeDeal(tenantId: string, bookingId: string, actorId?: string) {
    const existing = await this.snapshots.findOne({ where: { tenantId, bookingId } });
    if (existing) {
      const entryRows = await this.entries.find({ where: { snapshotId: existing.id, tenantId } });
      return {
        data: mapSnapshot(existing),
        entries: entryRows.map(mapEntry),
        meta: { idempotentReplay: true },
      };
    }

    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException({ detail: `Booking ${bookingId} not found` });

    if (booking.status !== 'DEPOSITED') {
      throw new UnprocessableEntityException({
        detail: `Booking ${bookingId} must be DEPOSITED to close deal (status=${booking.status})`,
      });
    }

    const unit = await this.units.findOne({ where: { id: booking.unitId, tenantId } });
    if (!unit) throw new NotFoundException({ detail: `Unit ${booking.unitId} not found` });

    const policy = await this.policies.getActivePublished(tenantId, unit.projectId);

    const dealAmount =
      policy.baseType === 'SALE_PRICE'
        ? Number(unit.basePrice)
        : Number(booking.depositAmount ?? 0);

    if (!Number.isFinite(dealAmount) || dealAmount <= 0) {
      throw new UnprocessableEntityException({ detail: 'Invalid deal amount for commission' });
    }

    const ratePercent = Number(policy.ratePercent);
    const totalCommission = calculateCommissionAmount(dealAmount, ratePercent);
    const policyHash = hashPolicySnapshot({
      projectId: policy.projectId,
      version: policy.version,
      ratePercent: policy.ratePercent,
      baseType: policy.baseType,
      splitRules: policy.splitRules,
    });

    const snapshotId = `cs_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const snapshot = await this.snapshots.save({
      id: snapshotId,
      tenantId,
      bookingId,
      policyId: policy.id,
      policyVersion: policy.version,
      policyHash,
      dealAmount: String(dealAmount),
      totalCommission: String(totalCommission),
      status: 'CALCULATED',
    });

    const entryRows: CommissionEntryEntity[] = [];
    for (const rule of policy.splitRules) {
      const amount = Math.round((totalCommission * rule.percent) / 100);
      entryRows.push(
        await this.entries.save({
          id: `ce_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
          tenantId,
          snapshotId,
          recipientType: recipientTypeForRole(rule.role),
          recipientId: rule.recipientId,
          role: rule.role,
          splitPercent: String(rule.percent),
          amount: String(amount),
          payoutStatus: 'PENDING',
        }),
      );
    }

    const splitSum = entryRows.reduce((sum, e) => sum + Number(e.splitPercent), 0);
    if (Math.abs(splitSum - 100) > 0.001) {
      throw new UnprocessableEntityException({ detail: 'Split lines must sum to 100%' });
    }

    await this.audit.append({
      tenantId,
      entityType: 'commission_snapshot',
      entityId: snapshotId,
      action: 'DEAL_CLOSED_SNAPSHOT',
      payload: {
        bookingId,
        policyId: policy.id,
        policyVersion: policy.version,
        policyHash,
        totalCommission,
        entryCount: entryRows.length,
      },
      actorId: actorId ?? null,
    });

    return {
      data: mapSnapshot(snapshot),
      entries: entryRows.map(mapEntry),
      meta: { splitTotalPercent: splitSum, payoutBlocked: false },
    };
  }

  /** UC-COM-04 — holdback blocks payout */
  async openHoldback(
    tenantId: string,
    snapshotId: string,
    input: OpenHoldbackInput,
    actorId?: string,
  ) {
    const snapshot = await this.snapshots.findOne({ where: { id: snapshotId, tenantId } });
    if (!snapshot) throw new NotFoundException({ detail: `Snapshot ${snapshotId} not found` });

    const openDispute = await this.disputes.findOne({
      where: { tenantId, snapshotId, status: 'OPEN' },
    });
    if (openDispute) {
      return { data: mapDispute(openDispute), meta: { idempotentReplay: true } };
    }

    const holdbackPercent = input.holdbackPercent ?? 100;
    if (!Number.isFinite(holdbackPercent) || holdbackPercent <= 0 || holdbackPercent > 100) {
      throw new UnprocessableEntityException({ detail: 'holdbackPercent must be 1-100' });
    }

    const dispute = await this.disputes.save({
      id: `cd_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      snapshotId,
      reason: input.reason?.trim() || 'Dispute opened',
      status: 'OPEN',
      holdbackPercent: String(holdbackPercent),
      resolvedAt: null,
    });

    snapshot.status = 'HOLDBACK';
    await this.snapshots.save(snapshot);

    await this.entries.update(
      { tenantId, snapshotId },
      { payoutStatus: 'HOLDBACK' },
    );

    await this.audit.append({
      tenantId,
      entityType: 'commission_dispute',
      entityId: dispute.id,
      action: 'HOLDBACK_OPENED',
      payload: { snapshotId, holdbackPercent },
      actorId: actorId ?? null,
    });

    return { data: mapDispute(dispute) };
  }

  async resolveHoldback(tenantId: string, snapshotId: string, disputeId: string, actorId?: string) {
    const snapshot = await this.snapshots.findOne({ where: { id: snapshotId, tenantId } });
    if (!snapshot) throw new NotFoundException({ detail: `Snapshot ${snapshotId} not found` });

    const dispute = await this.disputes.findOne({
      where: { id: disputeId, tenantId, snapshotId },
    });
    if (!dispute) throw new NotFoundException({ detail: `Dispute ${disputeId} not found` });

    if (dispute.status === 'RESOLVED') {
      return { data: mapDispute(dispute), meta: { idempotentReplay: true } };
    }

    dispute.status = 'RESOLVED';
    dispute.resolvedAt = new Date();
    await this.disputes.save(dispute);

    snapshot.status = 'RELEASED';
    await this.snapshots.save(snapshot);

    await this.entries.update(
      { tenantId, snapshotId, payoutStatus: 'HOLDBACK' },
      { payoutStatus: 'PENDING' },
    );

    await this.audit.append({
      tenantId,
      entityType: 'commission_dispute',
      entityId: disputeId,
      action: 'HOLDBACK_RELEASED',
      payload: { snapshotId },
      actorId: actorId ?? null,
    });

    return { data: mapDispute(dispute) };
  }
}
