import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  ConsentLedgerEntryEntity,
  type ConsentPurpose,
  type ConsentSubjectType,
} from '../../database/entities/consent-ledger-entry.entity';
import { AuditService } from '../audit/audit.service';

export type RecordConsentInput = {
  subjectType: ConsentSubjectType;
  subjectId: string;
  purpose: ConsentPurpose;
  policyVersion: string;
  granted: boolean;
  channel?: string;
  ip?: string;
  actorId?: string | null;
};

@Injectable()
export class ConsentLedgerService {
  constructor(
    @InjectRepository(ConsentLedgerEntryEntity)
    private readonly entries: Repository<ConsentLedgerEntryEntity>,
    private readonly audit: AuditService,
  ) {}

  status() {
    return { module: 'consent-ledger', uc: 'PDPA', appendOnly: true };
  }

  async record(tenantId: string, input: RecordConsentInput) {
    const row = await this.entries.save({
      id: `cns_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      subjectType: input.subjectType,
      subjectId: input.subjectId.trim(),
      purpose: input.purpose,
      policyVersion: input.policyVersion.trim() || 'v1',
      granted: input.granted,
      channel: input.channel?.trim() ?? null,
      ipHash: input.ip ? createHash('sha256').update(input.ip.trim()).digest('hex').slice(0, 32) : null,
      actorId: input.actorId ?? null,
      recordedAt: new Date(),
    });

    await this.audit.append({
      tenantId,
      entityType: 'consent_ledger',
      entityId: row.id,
      action: input.granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      payload: {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        purpose: input.purpose,
        policyVersion: input.policyVersion,
      },
      actorId: input.actorId ?? null,
    });

    return {
      data: {
        id: row.id,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        purpose: row.purpose,
        policyVersion: row.policyVersion,
        granted: row.granted,
        channel: row.channel,
        recordedAt: row.recordedAt.toISOString(),
      },
    };
  }

  async listForSubject(tenantId: string, subjectType: ConsentSubjectType, subjectId: string) {
    const rows = await this.entries.find({
      where: { tenantId, subjectType, subjectId: subjectId.trim() },
      order: { recordedAt: 'DESC' },
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        purpose: row.purpose,
        policyVersion: row.policyVersion,
        granted: row.granted,
        channel: row.channel,
        actorId: row.actorId,
        recordedAt: row.recordedAt.toISOString(),
      })),
      meta: { tenantId, subjectType, subjectId, count: rows.length },
    };
  }

  /** T7-S4 — PDPA consent gate for sensitive document access */
  async hasValidConsent(
    tenantId: string,
    subjectType: ConsentSubjectType,
    subjectId: string,
    purpose: ConsentPurpose,
  ): Promise<boolean> {
    const result = await this.listForSubject(tenantId, subjectType, subjectId);
    return result.data.some((row) => row.purpose === purpose && row.granted);
  }

  async exportCsv(tenantId: string, limit = 500) {
    const rows = await this.entries.find({
      where: { tenantId },
      order: { recordedAt: 'DESC' },
      take: limit,
    });

    const header = 'id,subjectType,subjectId,purpose,policyVersion,granted,channel,recordedAt';
    const lines = rows.map(
      (r) =>
        `${r.id},${r.subjectType},${r.subjectId},${r.purpose},${r.policyVersion},${r.granted},${r.channel ?? ''},${r.recordedAt.toISOString()}`,
    );

    return {
      data: { csv: [header, ...lines].join('\n'), rowCount: rows.length },
      meta: { tenantId, format: 'csv', uc: ['PDPA'] },
    };
  }
}
