import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TrustDisputeEntity } from '../../database/entities/trust-dispute.entity';
import { AuditService } from '../audit/audit.service';
import type {
  OpenTrustDisputeInput,
  ResolveTrustDisputeInput,
  TrustDisputeRecord,
} from './trust.types';

function mapDispute(row: TrustDisputeEntity): TrustDisputeRecord {
  return {
    id: row.id,
    attributes: {
      bookingId: row.bookingId,
      type: row.type,
      status: row.status,
      reason: row.reason,
      evidence: row.evidence ?? [],
      resolutionNote: row.resolutionNote,
      openedBy: row.openedBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    },
  };
}

@Injectable()
export class TrustService {
  constructor(
    @InjectRepository(TrustDisputeEntity)
    private readonly disputes: Repository<TrustDisputeEntity>,
    private readonly audit: AuditService,
  ) {}

  async listDisputes(tenantId: string, status?: TrustDisputeEntity['status']) {
    const where: { tenantId: string; status?: TrustDisputeEntity['status'] } = { tenantId };
    if (status) where.status = status;
    const rows = await this.disputes.find({
      where,
      order: { updatedAt: 'DESC' },
    });
    return {
      data: rows.map(mapDispute),
      meta: { tenantId, count: rows.length, status: status ?? 'ALL' },
    };
  }

  async getDispute(tenantId: string, disputeId: string) {
    const row = await this.disputes.findOne({ where: { id: disputeId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Dispute ${disputeId} not found` });
    return { data: mapDispute(row) };
  }

  async openDispute(tenantId: string, input: OpenTrustDisputeInput, actorId?: string) {
    if (!input.reason?.trim()) {
      throw new UnprocessableEntityException({ detail: 'reason is required' });
    }
    const id = `dsp_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const row = await this.disputes.save({
      id,
      tenantId,
      bookingId: input.bookingId?.trim() || null,
      type: input.type ?? 'OTHER',
      status: 'OPEN',
      reason: input.reason.trim(),
      evidence: input.evidence ?? [],
      resolutionNote: null,
      openedBy: actorId ?? null,
      resolvedAt: null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'trust_dispute',
      entityId: id,
      action: 'CREATE',
      payload: { bookingId: row.bookingId, type: row.type },
      actorId: actorId ?? null,
    });

    return { data: mapDispute(row) };
  }

  async startMediation(tenantId: string, disputeId: string, actorId?: string) {
    const row = await this.disputes.findOne({ where: { id: disputeId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Dispute ${disputeId} not found` });
    if (row.status === 'RESOLVED') {
      return { data: mapDispute(row), meta: { idempotentReplay: true } };
    }
    row.status = 'IN_MEDIATION';
    await this.disputes.save(row);
    await this.audit.append({
      tenantId,
      entityType: 'trust_dispute',
      entityId: disputeId,
      action: 'PATCH',
      payload: { status: 'IN_MEDIATION' },
      actorId: actorId ?? null,
    });
    return { data: mapDispute(row) };
  }

  async resolveDispute(
    tenantId: string,
    disputeId: string,
    input: ResolveTrustDisputeInput,
    actorId?: string,
  ) {
    const row = await this.disputes.findOne({ where: { id: disputeId, tenantId } });
    if (!row) throw new NotFoundException({ detail: `Dispute ${disputeId} not found` });
    if (row.status === 'RESOLVED') {
      return { data: mapDispute(row), meta: { idempotentReplay: true } };
    }
    if (!input.resolutionNote?.trim()) {
      throw new UnprocessableEntityException({ detail: 'resolutionNote is required' });
    }
    row.status = 'RESOLVED';
    row.resolutionNote = input.resolutionNote.trim();
    row.resolvedAt = new Date();
    await this.disputes.save(row);
    await this.audit.append({
      tenantId,
      entityType: 'trust_dispute',
      entityId: disputeId,
      action: 'RESOLVE',
      payload: { resolutionNote: row.resolutionNote },
      actorId: actorId ?? null,
    });
    return { data: mapDispute(row) };
  }
}
