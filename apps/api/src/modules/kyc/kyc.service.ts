import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  KycProfileEntity,
  type KycStatus,
  type KycSubjectType,
} from '../../database/entities/kyc-profile.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import type { CommissionEntryEntity } from '../../database/entities/commission-entry.entity';
import type { KycPayoutBlock, KycProfileRecord } from './kyc.types';
import { buildKycChecklist, mapKycAuditLabel } from './kyc-workflow.util';

const DEFAULT_STATUS: KycStatus = 'PENDING';

export function resolveKycSubject(
  recipientType: string,
  recipientId: string,
): { subjectType: KycSubjectType; subjectId: string } {
  if (recipientType === 'AGENCY') {
    return { subjectType: 'AGENCY', subjectId: recipientId };
  }
  return { subjectType: 'USER', subjectId: recipientId };
}

function mapProfile(row: KycProfileEntity): KycProfileRecord {
  return {
    id: row.id,
    attributes: {
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      status: row.status,
      verifiedAt: row.verifiedAt?.toISOString(),
      notes: row.notes ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycProfileEntity)
    private readonly profiles: Repository<KycProfileEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
  ) {}

  status() {
    return { module: 'kyc', uc: 'UC-ID-05', rule: 'BR-23' };
  }

  async listProfiles(tenantId: string, subjectType?: KycSubjectType) {
    const where: Record<string, string> = { tenantId };
    if (subjectType) where.subjectType = subjectType;

    const rows = await this.profiles.find({ where, order: { updatedAt: 'DESC' } });
    return { data: rows.map(mapProfile), meta: { count: rows.length } };
  }

  async getProfile(tenantId: string, subjectType: KycSubjectType, subjectId: string) {
    const row = await this.profiles.findOne({ where: { tenantId, subjectType, subjectId } });
    if (!row) {
      return {
        data: {
          id: 'kyc_missing',
          attributes: {
            subjectType,
            subjectId,
            status: DEFAULT_STATUS,
            updatedAt: new Date().toISOString(),
          },
        },
        meta: { implicit: true },
      };
    }
    return { data: mapProfile(row) };
  }

  async getStatus(tenantId: string, subjectType: KycSubjectType, subjectId: string): Promise<KycStatus> {
    const row = await this.profiles.findOne({ where: { tenantId, subjectType, subjectId } });
    return row?.status ?? DEFAULT_STATUS;
  }

  isPayoutEligible(status: KycStatus): boolean {
    return status === 'APPROVED';
  }

  async enrichEntry(
    tenantId: string,
    entry: CommissionEntryEntity,
    entryId?: string,
  ): Promise<{
    kycStatus: KycStatus;
    payoutEligible: boolean;
    kycSubjectType: KycSubjectType;
  }> {
    const { subjectType, subjectId } = resolveKycSubject(entry.recipientType, entry.recipientId);
    const kycStatus = await this.getStatus(tenantId, subjectType, subjectId);
    return {
      kycStatus,
      payoutEligible: this.isPayoutEligible(kycStatus),
      kycSubjectType: subjectType,
    };
  }

  async assertEntriesPayoutEligible(
    tenantId: string,
    entries: CommissionEntryEntity[],
  ): Promise<void> {
    const blocked: KycPayoutBlock[] = [];

    for (const entry of entries) {
      const { subjectType } = resolveKycSubject(entry.recipientType, entry.recipientId);
      const kycStatus = await this.getStatus(tenantId, subjectType, entry.recipientId);
      if (!this.isPayoutEligible(kycStatus)) {
        blocked.push({
          entryId: entry.id,
          recipientType: entry.recipientType,
          recipientId: entry.recipientId,
          subjectType,
          kycStatus,
        });
      }
    }

    if (blocked.length > 0) {
      throw new UnprocessableEntityException({
        detail: 'BR-23: KYC/KYB phải APPROVED trước khi duyệt chi HH',
        code: 'KYC_PAYOUT_BLOCKED',
        blocked,
      });
    }
  }

  /** UC-ID-05 — platform/finance approve KYC (pilot API) */
  async approveProfile(
    tenantId: string,
    subjectType: KycSubjectType,
    subjectId: string,
    actorId?: string,
    notes?: string,
  ) {
    let row = await this.profiles.findOne({ where: { tenantId, subjectType, subjectId } });
    if (!row) {
      row = await this.profiles.save({
        id: `kyc_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        tenantId,
        subjectType,
        subjectId,
        status: 'APPROVED',
        verifiedAt: new Date(),
        notes: notes?.trim() ?? null,
      });
    } else {
      row.status = 'APPROVED';
      row.verifiedAt = new Date();
      if (notes?.trim()) row.notes = notes.trim();
      row = await this.profiles.save(row);
    }

    await this.audit.append({
      tenantId,
      entityType: 'kyc_profile',
      entityId: row.id,
      action: 'KYC_APPROVED',
      payload: { subjectType, subjectId },
      actorId: actorId ?? null,
    });

    return { data: mapProfile(row) };
  }

  async rejectProfile(
    tenantId: string,
    subjectType: KycSubjectType,
    subjectId: string,
    actorId?: string,
    notes?: string,
  ) {
    const row = await this.profiles.findOne({ where: { tenantId, subjectType, subjectId } });
    if (!row) throw new NotFoundException({ detail: 'KYC profile not found' });

    row.status = 'REJECTED';
    row.verifiedAt = null;
    if (notes?.trim()) row.notes = notes.trim();
    await this.profiles.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'kyc_profile',
      entityId: row.id,
      action: 'KYC_REJECTED',
      payload: { subjectType, subjectId },
      actorId: actorId ?? null,
    });

    return { data: mapProfile(row) };
  }

  /** UC-ID-05 · SCR-ADMIN-014 — workflow detail with checklist + audit timeline */
  async getWorkflow(tenantId: string, subjectType: KycSubjectType, subjectId: string) {
    const profileRes = await this.getProfile(tenantId, subjectType, subjectId.trim());
    const status = profileRes.data.attributes.status;

    const auditRows = await this.auditEvents.find({
      where: { tenantId, entityType: 'kyc_profile' },
      order: { createdAt: 'DESC' },
      take: 30,
    });

    const events = auditRows
      .filter((row) => {
        const payload = (row.payload ?? {}) as { subjectType?: string; subjectId?: string };
        return payload.subjectType === subjectType && payload.subjectId === subjectId.trim();
      })
      .map((row) => ({
        id: row.id,
        action: row.action,
        label: mapKycAuditLabel(row.action),
        actorId: row.actorId,
        createdAt: row.createdAt.toISOString(),
        payload: row.payload as Record<string, unknown>,
      }));

    return {
      data: {
        profile: profileRes.data,
        checklist: buildKycChecklist(subjectType, status),
        events,
        payoutGate: status === 'APPROVED',
      },
      meta: { uc: ['UC-ID-05'], screen: 'SCR-ADMIN-014', tenantId },
    };
  }

  async requestResubmit(
    tenantId: string,
    subjectType: KycSubjectType,
    subjectId: string,
    reason: string,
    actorId?: string,
  ) {
    let row = await this.profiles.findOne({ where: { tenantId, subjectType, subjectId: subjectId.trim() } });
    if (!row) {
      row = await this.profiles.save({
        id: `kyc_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        tenantId,
        subjectType,
        subjectId: subjectId.trim(),
        status: 'PENDING',
        verifiedAt: null,
        notes: reason.trim(),
      });
    } else {
      row.status = 'PENDING';
      row.verifiedAt = null;
      row.notes = reason.trim();
      row = await this.profiles.save(row);
    }

    await this.audit.append({
      tenantId,
      entityType: 'kyc_profile',
      entityId: row.id,
      action: 'KYC_RESUBMIT_REQUESTED',
      payload: { subjectType, subjectId: subjectId.trim(), reason: reason.trim() },
      actorId: actorId ?? null,
    });

    return this.getWorkflow(tenantId, subjectType, subjectId);
  }
}
