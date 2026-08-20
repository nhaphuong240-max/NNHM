import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { ConsentLedgerService } from '../compliance/consent-ledger.service';
import { DocumentsService } from '../documents/documents.service';
import { BookingContractEsignProviderService } from './booking-contract-esign-provider.service';
import { BookingContractEsignSmsService } from './booking-contract-esign-sms.service';
import type {
  ContractDraftRecord,
  ContractMergeContext,
  ContractPreviewInput,
  ContractSignInput,
  CreateContractInput,
} from './booking-contract.types';
import {
  CONTRACT_TEMPLATES,
  buildSignedDocumentRef,
  getContractTemplate,
  mergeContractTemplate,
} from './booking-contract.util';

@Injectable()
export class BookingContractService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
    private readonly documents: DocumentsService,
    private readonly esignSms: BookingContractEsignSmsService,
    private readonly esignProvider: BookingContractEsignProviderService,
    private readonly consentLedger: ConsentLedgerService,
  ) {}

  listTemplates() {
    return {
      data: CONTRACT_TEMPLATES,
      meta: { count: CONTRACT_TEMPLATES.length, uc: ['UC-BK-06'], screen: 'SCR-AGENT-006' },
    };
  }

  async preview(tenantId: string, input: ContractPreviewInput) {
    const { mergeContext, template } = await this.resolveMergeContext(tenantId, input);
    const mergedText = mergeContractTemplate(template.id, mergeContext);

    return {
      data: {
        templateId: template.id,
        templateLabel: template.label,
        bookingId: input.bookingId,
        leadId: input.leadId ?? undefined,
        mergedText,
        mergeContext,
      },
      meta: { uc: ['UC-BK-06'], screen: 'SCR-AGENT-006', mode: 'preview' },
    };
  }

  async createDraft(tenantId: string, input: CreateContractInput, actorId?: string) {
    const preview = await this.preview(tenantId, input);
    const contractId = `ctr_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const createdAt = new Date().toISOString();

    const record: ContractDraftRecord = {
      id: contractId,
      attributes: {
        templateId: preview.data.templateId,
        templateLabel: preview.data.templateLabel,
        bookingId: input.bookingId,
        leadId: input.leadId,
        status: 'DRAFT',
        mergedText: preview.data.mergedText,
        mergeContext: preview.data.mergeContext,
        notes: input.notes?.trim() || undefined,
        createdAt,
        createdBy: actorId,
      },
    };

    await this.audit.append({
      tenantId,
      entityType: 'contract',
      entityId: contractId,
      action: 'DRAFT',
      payload: {
        ...record.attributes,
        bookingId: input.bookingId,
      },
      actorId: actorId ?? null,
    });

    return {
      data: record,
      meta: { uc: ['UC-BK-06'], screen: 'SCR-AGENT-006', status: 'DRAFT' },
    };
  }

  /** UC-BK-07 — buyer-facing contract detail (DRAFT or SIGNED) */
  async getContract(tenantId: string, contractId: string) {
    const record = await this.loadContractRecord(tenantId, contractId.trim());
    if (!record) {
      throw new NotFoundException({ detail: `Contract ${contractId} not found` });
    }
    return {
      data: record,
      meta: { uc: ['UC-BK-07'], screen: 'SCR-BUYER-003', status: record.attributes.status },
    };
  }

  /** UC-BK-07 — sign session + SMS OTP (UC-NW-03) */
  async getSignSession(tenantId: string, contractId: string) {
    const record = await this.loadContractRecord(tenantId, contractId.trim());
    if (!record) {
      throw new NotFoundException({ detail: `Contract ${contractId} not found` });
    }
    if (record.attributes.status === 'SIGNED') {
      throw new UnprocessableEntityException({ detail: 'Contract already signed' });
    }

    const otpResult = await this.esignSms.sendContractOtp(
      tenantId,
      record.id,
      record.attributes.bookingId,
      record.attributes.mergeContext.buyerName,
    );

    const provider = await this.esignProvider.resolve(tenantId);
    let signingUrl: string | undefined;
    let envelopeId: string | undefined;
    let providerId = 'WEREAL_ESIGN_STUB';

    if (provider) {
      const envelope = await provider.createEnvelope({
        tenantId,
        contractId: record.id,
        signerName: record.attributes.mergeContext.buyerName,
        signerEmail: record.attributes.mergeContext.buyerEmail,
        documentText: record.attributes.mergedText,
      });
      signingUrl = envelope.signingUrl;
      envelopeId = envelope.envelopeId;
      providerId = envelope.provider;
    }

    return {
      data: {
        contractId: record.id,
        bookingId: record.attributes.bookingId,
        templateLabel: record.attributes.templateLabel,
        status: record.attributes.status,
        mergedText: record.attributes.mergedText,
        buyerName: record.attributes.mergeContext.buyerName,
        unitCode: record.attributes.mergeContext.unitCode,
        otpSent: otpResult.sent,
        otpHint: otpResult.sandbox ? 'Demo OTP: 123456 (SMS sandbox)' : undefined,
        deliveryId: otpResult.deliveryId,
        signingUrl,
        envelopeId,
        provider: providerId,
        providerMode: provider ? 'legal-provider' : 'otp-stub',
      },
      meta: { uc: ['UC-BK-07', 'UC-NW-03'], screen: 'SCR-BUYER-003', mode: 'sign-session' },
    };
  }

  /** UC-BK-07 — e-sign stub + document vault ref */
  async signContract(tenantId: string, contractId: string, input: ContractSignInput) {
    const record = await this.loadContractRecord(tenantId, contractId.trim());
    if (!record) {
      throw new NotFoundException({ detail: `Contract ${contractId} not found` });
    }
    if (record.attributes.status === 'SIGNED') {
      throw new UnprocessableEntityException({ detail: 'Contract already signed' });
    }
    if (!input.consent) {
      throw new BadRequestException({ detail: 'Consent required before e-sign' });
    }
    if (!input.signerName?.trim()) {
      throw new BadRequestException({ detail: 'signerName is required' });
    }
    const otpValid = await this.esignSms.validateContractOtp(tenantId, record.id, input.otp);
    if (!otpValid) {
      throw new UnprocessableEntityException({ detail: 'Invalid OTP — request a new sign session' });
    }

    await this.consentLedger.record(tenantId, {
      subjectType: 'CONTRACT',
      subjectId: record.id,
      purpose: 'ESIGN',
      policyVersion: '2026-07-01',
      granted: true,
      channel: 'BUYER_PORTAL',
    });

    const signedAt = new Date().toISOString();
    const providerAdapter = await this.esignProvider.resolve(tenantId);
    const providerName = providerAdapter?.providerId ?? 'WEREAL_ESIGN_STUB';
    const signatureRef = `sig_${record.id}_${Date.now()}`;
    const signedText = [
      record.attributes.mergedText,
      '',
      '---',
      'ĐÃ KÝ ĐIỆN TỬ (UC-BK-07)',
      `Người ký: ${input.signerName.trim()}`,
      `Thời gian: ${signedAt}`,
      `Chữ ký số: ${signatureRef}`,
      `Provider: ${providerName}`,
    ].join('\n');
    const buffer = Buffer.from(signedText, 'utf8');

    const vaultUpload = await this.documents.uploadFromBuffer(
      tenantId,
      {
        originalname: `${record.id}_signed.txt`,
        mimetype: 'text/plain',
        size: buffer.length,
        buffer,
      },
      {
        entityType: 'BOOKING',
        entityId: record.attributes.bookingId,
        docType: 'SIGNED_CONTRACT',
        folder: 'CONTRACT',
        retentionClass: '10Y',
      },
    );

    const documentId = vaultUpload.data.id;
    const documentVaultRef = buildSignedDocumentRef(documentId);

    await this.audit.append({
      tenantId,
      entityType: 'contract',
      entityId: record.id,
      action: 'SIGNED',
      payload: {
        bookingId: record.attributes.bookingId,
        templateId: record.attributes.templateId,
        signerName: input.signerName.trim(),
        signedAt,
        documentId,
        documentVaultRef,
        signatureRef,
        provider: providerName,
        envelopeId: input.envelopeId ?? null,
      },
      actorId: null,
    });

    const signed: ContractDraftRecord = {
      id: record.id,
      attributes: {
        ...record.attributes,
        status: 'SIGNED',
        signedAt,
        signedBy: input.signerName.trim(),
        documentId,
        documentVaultRef,
        signatureRef,
      },
    };

    return {
      data: signed,
      meta: { uc: ['UC-BK-07'], screen: 'SCR-BUYER-003', status: 'SIGNED' },
    };
  }

  /** UC-BK-07 — legal provider webhook (VNPT SmartCA sandbox) */
  async handleEsignWebhook(tenantId: string, body: unknown, rawBody?: string, signature?: string) {
    const adapter = this.esignProvider.registry().resolve();
    if (rawBody && !adapter.verifyWebhookSignature(rawBody, signature)) {
      throw new UnprocessableEntityException({ detail: 'Invalid e-sign webhook signature' });
    }

    const payload = adapter.parseWebhook(body);
    if (!payload || payload.event !== 'SIGNED') {
      return { data: { received: true, processed: false }, meta: { mode: 'webhook' } };
    }

    const record = await this.loadContractRecord(tenantId, payload.contractId);
    if (!record || record.attributes.status === 'SIGNED') {
      return { data: { received: true, idempotent: true }, meta: { mode: 'webhook' } };
    }

    const signedAt = payload.signedAt ?? new Date().toISOString();
    const providerName = adapter.providerId;
    const signatureRef = payload.signatureRef ?? `sig_${payload.envelopeId}`;
    const pdf = (await adapter.downloadSignedPdf(payload.envelopeId)) ??
      Buffer.from(`${record.attributes.mergedText}\nSigned via webhook`, 'utf8');

    const vaultUpload = await this.documents.uploadFromBuffer(
      tenantId,
      {
        originalname: `${record.id}_signed.txt`,
        mimetype: 'text/plain',
        size: pdf.length,
        buffer: pdf,
      },
      {
        entityType: 'BOOKING',
        entityId: record.attributes.bookingId,
        docType: 'SIGNED_CONTRACT',
        folder: 'CONTRACT',
        retentionClass: '10Y',
      },
    );

    await this.audit.append({
      tenantId,
      entityType: 'contract',
      entityId: record.id,
      action: 'SIGNED',
      payload: {
        bookingId: record.attributes.bookingId,
        templateId: record.attributes.templateId,
        signerName: record.attributes.mergeContext.buyerName,
        signedAt,
        documentId: vaultUpload.data.id,
        documentVaultRef: buildSignedDocumentRef(vaultUpload.data.id),
        signatureRef,
        provider: providerName,
        envelopeId: payload.envelopeId,
        providerRef: payload.envelopeId,
      },
      actorId: null,
    });

    return {
      data: {
        received: true,
        contractId: record.id,
        event: payload.event,
        signatureRef,
        envelopeId: payload.envelopeId,
      },
      meta: { uc: ['UC-BK-07'], mode: 'webhook-live' },
    };
  }

  async listDrafts(tenantId: string, bookingId?: string) {
    const qb = this.auditEvents
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.entity_type = :entityType', { entityType: 'contract' })
      .andWhere('e.action = :action', { action: 'DRAFT' })
      .orderBy('e.created_at', 'DESC')
      .take(50);

    if (bookingId?.trim()) {
      qb.andWhere("e.payload->>'bookingId' = :bookingId", { bookingId: bookingId.trim() });
    }

    const rows = await qb.getMany();
    const data: ContractDraftRecord[] = rows.map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      return {
        id: row.entityId,
        attributes: {
          templateId: String(payload.templateId ?? ''),
          templateLabel: String(payload.templateLabel ?? ''),
          bookingId: String(payload.bookingId ?? ''),
          leadId: payload.leadId ? String(payload.leadId) : undefined,
          status: 'DRAFT',
          mergedText: String(payload.mergedText ?? ''),
          mergeContext: payload.mergeContext as ContractMergeContext,
          notes: payload.notes ? String(payload.notes) : undefined,
          createdAt: row.createdAt.toISOString(),
          createdBy: row.actorId ?? undefined,
        },
      };
    });

    return {
      data,
      meta: { count: data.length, tenantId, bookingId: bookingId ?? null, uc: ['UC-BK-06'] },
    };
  }

  private async resolveMergeContext(tenantId: string, input: ContractPreviewInput) {
    const template = getContractTemplate(input.templateId?.trim());
    if (!template) {
      throw new UnprocessableEntityException({ detail: `Unknown template ${input.templateId}` });
    }

    const booking = await this.bookings.findOne({
      where: { id: input.bookingId.trim(), tenantId },
    });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${input.bookingId} not found` });
    }

    const unit = await this.units.findOne({
      where: { id: booking.unitId, tenantId },
      relations: { project: true },
    });
    if (!unit) {
      throw new NotFoundException({ detail: `Unit ${booking.unitId} not found` });
    }

    const project =
      unit.project ??
      (await this.projects.findOne({ where: { id: unit.projectId, tenantId } }));

    const leadId = input.leadId?.trim() || booking.leadId || undefined;
    let lead: LeadEntity | null = null;
    if (leadId) {
      lead = await this.leads.findOne({ where: { id: leadId, tenantId } });
    }

    const mergeContext: ContractMergeContext = {
      buyerName: input.overrides?.buyerName?.trim() || lead?.fullName || 'Khách hàng',
      buyerPhone: input.overrides?.buyerPhone?.trim() || lead?.phone || '—',
      buyerEmail: input.overrides?.buyerEmail?.trim() || lead?.email || undefined,
      unitCode: unit.code,
      unitArea: unit.area,
      basePrice: Number(unit.basePrice),
      depositAmount: booking.depositAmount ? Number(booking.depositAmount) : undefined,
      bookingId: booking.id,
      projectName: project?.name ?? unit.projectId,
      agentLabel: 'WEREAL Agent Portal',
      contractDate: new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    };

    return { mergeContext, template, booking };
  }

  private async loadContractRecord(
    tenantId: string,
    contractId: string,
  ): Promise<ContractDraftRecord | null> {
    const draft = await this.auditEvents.findOne({
      where: {
        tenantId,
        entityType: 'contract',
        entityId: contractId,
        action: 'DRAFT',
      },
      order: { createdAt: 'DESC' },
    });
    if (!draft) return null;

    const payload = (draft.payload ?? {}) as Record<string, unknown>;
    const signed = await this.auditEvents.findOne({
      where: {
        tenantId,
        entityType: 'contract',
        entityId: contractId,
        action: 'SIGNED',
      },
      order: { createdAt: 'DESC' },
    });
    const signedPayload = (signed?.payload ?? {}) as Record<string, unknown>;

    return {
      id: contractId,
      attributes: {
        templateId: String(payload.templateId ?? ''),
        templateLabel: String(payload.templateLabel ?? ''),
        bookingId: String(payload.bookingId ?? ''),
        leadId: payload.leadId ? String(payload.leadId) : undefined,
        status: signed ? 'SIGNED' : 'DRAFT',
        mergedText: String(payload.mergedText ?? ''),
        mergeContext: payload.mergeContext as ContractMergeContext,
        notes: payload.notes ? String(payload.notes) : undefined,
        createdAt: draft.createdAt.toISOString(),
        createdBy: draft.actorId ?? undefined,
        signedAt: signedPayload.signedAt ? String(signedPayload.signedAt) : undefined,
        signedBy: signedPayload.signerName ? String(signedPayload.signerName) : undefined,
        documentId: signedPayload.documentId ? String(signedPayload.documentId) : undefined,
        documentVaultRef: signedPayload.documentVaultRef
          ? String(signedPayload.documentVaultRef)
          : undefined,
        signatureRef: signedPayload.signatureRef ? String(signedPayload.signatureRef) : undefined,
      },
    };
  }
}
