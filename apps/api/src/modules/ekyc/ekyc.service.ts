import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  KycProfileEntity,
  type KycSubjectType,
} from '../../database/entities/kyc-profile.entity';
import { AuditService } from '../audit/audit.service';
import { EkycAdapterRegistry } from './vnpt-ekyc.adapter';
import type { EkycWebhookPayload } from './ekyc-provider.adapter';

@Injectable()
export class EkycService {
  constructor(
    @InjectRepository(KycProfileEntity)
    private readonly profiles: Repository<KycProfileEntity>,
    private readonly audit: AuditService,
    private readonly adapters: EkycAdapterRegistry,
    private readonly config: ConfigService,
  ) {}

  status() {
    const provider = this.config.get<string>('EKYC_PROVIDER', 'VNPT_EKYC');
    const sandbox = this.config.get<string>('EKYC_SANDBOX', 'true') !== 'false';
    return { module: 'ekyc', provider, sandbox, uc: 'UC-ID-05', rule: 'BR-23' };
  }

  async startVerification(
    tenantId: string,
    subjectType: KycSubjectType,
    subjectId: string,
    actorId?: string,
    documentType?: string,
  ) {
    if (subjectType === 'TENANT') {
      throw new UnprocessableEntityException({ detail: 'TENANT eKYC not supported in pilot' });
    }

    const adapter = this.adapters.resolve();
    const started = await adapter.startVerification({
      tenantId,
      subjectType,
      subjectId: subjectId.trim(),
      documentType,
    });

    let row = await this.profiles.findOne({ where: { tenantId, subjectType, subjectId: subjectId.trim() } });
    if (!row) {
      row = await this.profiles.save({
        id: `kyc_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        tenantId,
        subjectType,
        subjectId: subjectId.trim(),
        status: 'PENDING',
        verifiedAt: null,
        notes: null,
        externalRef: started.externalRef,
        provider: started.provider,
        verificationLevel: null,
        documentType: documentType ?? 'CCCD',
      });
    } else {
      row.externalRef = started.externalRef;
      row.provider = started.provider;
      row.status = 'PENDING';
      row.verifiedAt = null;
      row.documentType = documentType ?? row.documentType ?? 'CCCD';
      row = await this.profiles.save(row);
    }

    await this.audit.append({
      tenantId,
      entityType: 'kyc_profile',
      entityId: row.id,
      action: 'EKYC_STARTED',
      payload: {
        subjectType,
        subjectId,
        externalRef: started.externalRef,
        provider: started.provider,
      },
      actorId: actorId ?? null,
    });

    return {
      data: {
        profileId: row.id,
        externalRef: started.externalRef,
        verificationUrl: started.verificationUrl,
        status: started.status,
        provider: started.provider,
      },
      meta: { uc: ['UC-ID-05'], screen: 'SCR-ADMIN-014' },
    };
  }

  async handleWebhook(tenantId: string, body: unknown) {
    const adapter = this.adapters.resolve();
    const payload = adapter.parseWebhook(body);
    if (!payload) {
      throw new UnprocessableEntityException({ detail: 'Invalid eKYC webhook payload' });
    }

    const row = await this.profiles.findOne({
      where: { tenantId, externalRef: payload.externalRef },
    });
    if (!row) {
      throw new NotFoundException({ detail: `eKYC session ${payload.externalRef} not found` });
    }

    await this.applyWebhookResult(tenantId, row, payload);
    return {
      data: { profileId: row.id, status: row.status, externalRef: payload.externalRef },
      meta: { uc: ['UC-ID-05'], provider: row.provider },
    };
  }

  /** Sandbox helper — auto-approve pending eKYC session */
  async simulateApprove(tenantId: string, externalRef: string, actorId?: string) {
    const sandbox = this.config.get<string>('EKYC_SANDBOX', 'true') !== 'false';
    if (!sandbox) {
      throw new UnprocessableEntityException({
        detail: 'simulateApprove disabled when EKYC_SANDBOX=false',
      });
    }

    const row = await this.profiles.findOne({ where: { tenantId, externalRef } });
    if (!row) throw new NotFoundException({ detail: 'eKYC session not found' });

    const payload: EkycWebhookPayload = {
      externalRef,
      status: 'APPROVED',
      verificationLevel: 'LEVEL_2',
      documentType: row.documentType ?? 'CCCD',
      verifiedAt: new Date().toISOString(),
    };
    await this.applyWebhookResult(tenantId, row, payload, actorId);
    return { data: { profileId: row.id, status: 'APPROVED', payoutEligible: true } };
  }

  private async applyWebhookResult(
    tenantId: string,
    row: KycProfileEntity,
    payload: EkycWebhookPayload,
    actorId?: string | null,
  ) {
    if (payload.status === 'APPROVED') {
      row.status = 'APPROVED';
      row.verifiedAt = payload.verifiedAt ? new Date(payload.verifiedAt) : new Date();
      row.verificationLevel = payload.verificationLevel ?? 'LEVEL_2';
      if (payload.documentType) row.documentType = payload.documentType;
    } else if (payload.status === 'REJECTED') {
      row.status = 'REJECTED';
      row.verifiedAt = null;
      row.notes = payload.reason ?? row.notes;
    } else {
      row.status = 'PENDING';
    }

    await this.profiles.save(row);

    await this.audit.append({
      tenantId,
      entityType: 'kyc_profile',
      entityId: row.id,
      action: payload.status === 'APPROVED' ? 'EKYC_APPROVED' : 'EKYC_WEBHOOK',
      payload: {
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        externalRef: payload.externalRef,
        status: payload.status,
        provider: row.provider,
      },
      actorId: actorId ?? null,
    });
  }
}
