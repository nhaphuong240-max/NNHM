import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessErrorCode, throwBusinessError } from '../../common/business-error';
import {
  DealDisputeEntity,
  type DealDisputeStatus,
} from '../../database/entities/deal-dispute.entity';
import { DealDisputeEventEntity } from '../../database/entities/deal-dispute-event.entity';
import { LeadRegistrationEntity } from '../../database/entities/lead-registration.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';

const TRANSITIONS: Record<DealDisputeStatus, DealDisputeStatus[]> = {
  OPEN: ['EVIDENCE', 'REVIEW', 'CLOSED'],
  EVIDENCE: ['REVIEW', 'CLOSED'],
  REVIEW: ['SPLIT', 'FAVOR_A', 'FAVOR_B', 'APPEAL', 'CLOSED'],
  SPLIT: ['CLOSED', 'APPEAL'],
  FAVOR_A: ['CLOSED', 'APPEAL'],
  FAVOR_B: ['CLOSED', 'APPEAL'],
  APPEAL: ['REVIEW', 'CLOSED'],
  CLOSED: [],
};

@Injectable()
export class DealDisputeService {
  constructor(
    @InjectRepository(DealDisputeEntity)
    private readonly disputes: Repository<DealDisputeEntity>,
    @InjectRepository(DealDisputeEventEntity)
    private readonly events: Repository<DealDisputeEventEntity>,
    @InjectRepository(LeadRegistrationEntity)
    private readonly registrations: Repository<LeadRegistrationEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly audit: AuditService,
  ) {}

  private mapDispute(row: DealDisputeEntity) {
    return {
      id: row.id,
      attributes: {
        registrationId: row.registrationId,
        projectId: row.projectId,
        status: row.status,
        openedByOrgId: row.openedByOrgId,
        defendingOrgId: row.defendingOrgId,
        piiSafeSummary: row.piiSafeSummary,
        attributionKey: row.attributionKey,
        slaDueAt: row.slaDueAt?.toISOString() ?? null,
        closedAt: row.closedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      },
    };
  }

  async listDisputes(tenantId: string) {
    const rows = await this.disputes.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return { data: rows.map((r) => this.mapDispute(r)), meta: { count: rows.length } };
  }

  async openDispute(
    tenantId: string,
    input: { registrationId: string; summary?: string },
    actorId: string,
  ) {
    const reg = await this.registrations.findOne({
      where: { id: input.registrationId, tenantId },
    });
    if (!reg) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Registration not found');
    }

    const open = await this.disputes.findOne({
      where: { tenantId, registrationId: reg.id, status: 'OPEN' as DealDisputeStatus },
    });
    if (open) {
      throwBusinessError(BusinessErrorCode.DISPUTE_OPEN, 'Dispute already open for this registration');
    }

    const actor = await this.users.findOne({ where: { id: actorId } });
    const defendingOrgId =
      reg.registeredByOrgId && reg.registeredByOrgId !== actor?.organizationId
        ? reg.registeredByOrgId
        : null;

    const id = `dp_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const slaDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const row = await this.disputes.save({
      id,
      tenantId,
      registrationId: reg.id,
      projectId: reg.projectId,
      status: 'OPEN',
      openedByOrgId: actor?.organizationId ?? 'unknown',
      openedByUserId: actorId,
      defendingOrgId,
      piiSafeSummary:
        input.summary?.trim() ||
        `Dispute on project ${reg.projectId} — customer ref ${reg.phoneNormalized.slice(-4)}`,
      attributionKey: null,
      slaDueAt: slaDue,
      closedAt: null,
    });

    reg.status = 'CONFLICT';
    await this.registrations.save(reg);

    await this.appendEvent(id, null, 'OPEN', actorId, input.summary);
    await this.audit.append({
      tenantId,
      entityType: 'deal_dispute',
      entityId: id,
      action: 'OPEN',
      actorId,
      payload: { registrationId: reg.id, defendingOrgId },
    });

    return { data: this.mapDispute(row), meta: { opened: true } };
  }

  async transition(
    tenantId: string,
    disputeId: string,
    toStatus: DealDisputeStatus,
    actorId: string,
    note?: string,
    attributionKey?: string,
  ) {
    const row = await this.disputes.findOne({ where: { id: disputeId, tenantId } });
    if (!row) {
      throwBusinessError(BusinessErrorCode.NOT_FOUND, 'Dispute not found');
    }
    const allowed = TRANSITIONS[row.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throwBusinessError(
        BusinessErrorCode.VALIDATION_FAILED,
        `Cannot transition ${row.status} → ${toStatus}`,
      );
    }

    const from = row.status;
    row.status = toStatus;
    if (toStatus === 'CLOSED') {
      row.closedAt = new Date();
      if (attributionKey?.trim()) row.attributionKey = attributionKey.trim();
    }
    await this.disputes.save(row);
    await this.appendEvent(disputeId, from, toStatus, actorId, note);

    return { data: this.mapDispute(row), meta: { from, to: toStatus } };
  }

  private async appendEvent(
    disputeId: string,
    from: DealDisputeStatus | null,
    to: DealDisputeStatus,
    actorId: string,
    note?: string,
  ) {
    const id = `dpe_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await this.events.save({
      id,
      disputeId,
      fromStatus: from,
      toStatus: to,
      actorId,
      note: note?.trim() ?? null,
      payload: {},
    });
  }
}
