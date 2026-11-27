import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import { AuditService } from '../audit/audit.service';
import { ConsentLedgerService } from '../compliance/consent-ledger.service';
import { DocumentsService } from '../documents/documents.service';
import { BookingContractEsignProviderService } from './booking-contract-esign-provider.service';
import { BookingContractEsignSmsService } from './booking-contract-esign-sms.service';
import type { ContractSignClaims } from './contract-sign-token';
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
import {
  LOCK_REQUEST_DOCUMENT_SQL,
  MARK_REQUEST_SIGNED_SQL,
  MARK_SIGNER_SIGNED_SQL,
  SET_REQUEST_CERTIFICATE_SQL,
  SET_REQUEST_DOCUMENT_SQL,
  returnedRows,
} from './esign-otp-atomic';
import { buildPlainPdf } from './esign-completion-pdf';
import { allSignersSigned, hashDocumentText, signerTurn, type SigningMode } from './esign-multi-party';

export type PreparedContractSignature = {
  tenantId: string;
  contractId: string;
  bookingId: string;
  signerId: string;
  requestId: string;
  signerName: string;
  signedAt: string;
  signatureRef: string;
  providerName: string;
  envelopeId: string | null;
  templateId: string;
  templateLabel: string;
  mergedText: string;
  mergeContext: ContractMergeContext;
  buffer: Buffer;
  fileName: string;
  auditId: string;
  ip?: string | null;
  userAgent?: string | null;
};

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
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
  async getSignSession(
    tenantId: string,
    contractId: string,
    access?: ContractSignClaims,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ) {
    const record = await this.loadContractRecord(tenantId, contractId.trim());
    if (!record) {
      throw new NotFoundException({ detail: `Contract ${contractId} not found` });
    }
    if (access) {
      await this.assertSignerTurn(tenantId, access);
      const request = await this.dataSource.getRepository(SignatureRequestEntity).findOne({
        where: { id: access.requestId, tenantId },
      });
      if (request?.documentHash && request.documentHash !== hashDocumentText(record.attributes.mergedText)) {
        throw new UnprocessableEntityException({ detail: 'document hash does not match the frozen copy' });
      }
      await this.dataSource.getRepository(SignatureEventEntity).save({
        id: `sev_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        tenantId,
        requestId: access.requestId,
        signerId: access.signerId,
        action: 'VIEWED',
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        occurredAt: new Date(),
        channel: access.channel,
        metadata: { jti: access.jti },
      });
    }
    if (record.attributes.status === 'SIGNED') {
      throw new UnprocessableEntityException({ detail: 'Contract already signed' });
    }

    const otpResult = await this.esignSms.sendContractOtp(
      tenantId,
      record.id,
      record.attributes.bookingId,
      record.attributes.mergeContext.buyerName,
      access,
    );

    const provider = await this.esignProvider.resolve(tenantId);
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
        deliveryId: otpResult.deliveryId,
        envelopeId,
        provider: providerId,
        providerMode: provider ? 'legal-provider' : 'otp-stub',
      },
      meta: { uc: ['UC-BK-07', 'UC-NW-03'], screen: 'SCR-BUYER-003', mode: 'sign-session' },
    };
  }

  async signingProviderName(tenantId: string): Promise<string> {
    const provider = await this.esignProvider.resolve(tenantId);
    return provider?.providerId ?? 'WEREAL_ESIGN_STUB';
  }

  /**
   * Database writes for one signature. The caller owns the transaction.
   * The vault object is not stored here.
   */
  async signContract(
    tenantId: string,
    contractId: string,
    input: ContractSignInput,
    access: ContractSignClaims | undefined,
    otpConsumed: boolean,
    manager: EntityManager,
    providerName?: string,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PreparedContractSignature> {
    if (!access?.signerId || !access.requestId) {
      throw new UnprocessableEntityException({ detail: 'sign access ticket is required' });
    }
    const record = await this.loadContractRecord(tenantId, contractId.trim(), manager);
    if (!record) {
      throw new NotFoundException({ detail: `Contract ${contractId} not found` });
    }
    if (record.attributes.status === 'SIGNED') {
      throw new UnprocessableEntityException({ detail: 'Contract already signed' });
    }
    await this.assertSignerTurn(tenantId, access, manager);
    const frozen = await manager.getRepository(SignatureRequestEntity).findOne({
      where: { id: access.requestId, tenantId },
    });
    if (frozen?.documentHash && frozen.documentHash !== hashDocumentText(record.attributes.mergedText)) {
      throw new UnprocessableEntityException({ detail: 'document hash does not match the frozen copy' });
    }
    if (!input.consent) {
      throw new BadRequestException({ detail: 'Consent required before e-sign' });
    }
    if (!input.signerName?.trim()) {
      throw new BadRequestException({ detail: 'signerName is required' });
    }
    if (!otpConsumed) {
      const otpValid = await this.esignSms.validateContractOtp(tenantId, record.id, input.otp, access.jti);
      if (!otpValid) {
        throw new UnprocessableEntityException({ detail: 'Invalid OTP' });
      }
    }

    const resolvedProvider = providerName ?? (await this.signingProviderName(tenantId));
    await this.consentLedger.record(
      tenantId,
      {
        subjectType: 'CONTRACT',
        subjectId: record.id,
        purpose: 'ESIGN',
        policyVersion: '2026-07-01',
        granted: true,
        channel: 'BUYER_PORTAL',
      },
      manager,
    );

    const signedAtDate = new Date();
    const signedAt = signedAtDate.toISOString();
    const signerName = input.signerName.trim();
    const signatureRef = `sig_${record.id}_${signedAtDate.getTime()}`;
    const marked = returnedRows(
      await manager.query(MARK_SIGNER_SIGNED_SQL, [
        access.signerId,
        tenantId,
        access.requestId,
        signedAtDate,
        signatureRef,
        signerName,
      ]),
    );
    if (marked.length !== 1) {
      throw new UnprocessableEntityException({ detail: 'signer already has a signed record' });
    }
    await manager.query(MARK_REQUEST_SIGNED_SQL, [access.requestId, tenantId]);
    try {
      await manager.getRepository(SignatureEventEntity).save({
        id: `sev_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        tenantId,
        requestId: access.requestId,
        signerId: access.signerId,
        action: 'SIGNED',
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        occurredAt: signedAtDate,
        channel: access.channel,
        metadata: { jti: access.jti },
      });
    } catch (error) {
      if (!uniqueViolation(error)) throw error;
      throw new UnprocessableEntityException({ detail: 'signer already has a signed record' });
    }

    const signedAudit = await this.audit.append(
      {
        tenantId,
        entityType: 'contract',
        entityId: record.id,
        action: 'SIGNED',
        payload: {
          bookingId: record.attributes.bookingId,
          templateId: record.attributes.templateId,
          signerName,
          signedAt,
          signatureRef,
          provider: resolvedProvider,
          envelopeId: input.envelopeId ?? null,
          vaultStatus: 'PENDING',
          requestId: access.requestId,
          signerId: access.signerId,
        },
        actorId: null,
      },
      manager,
    );

    const buffer = Buffer.from(
      signedContractText({
        mergedText: record.attributes.mergedText,
        signerName,
        signedAt,
        signatureRef,
        providerName: resolvedProvider,
      }),
      'utf8',
    );
    return {
      tenantId,
      contractId: record.id,
      bookingId: record.attributes.bookingId,
      signerId: access.signerId,
      requestId: access.requestId,
      signerName,
      signedAt,
      signatureRef,
      providerName: resolvedProvider,
      envelopeId: input.envelopeId ?? null,
      templateId: record.attributes.templateId,
      templateLabel: record.attributes.templateLabel,
      mergedText: record.attributes.mergedText,
      mergeContext: record.attributes.mergeContext,
      buffer,
      fileName: `${record.id}_${access.signerId}_signed.txt`,
      auditId: String(signedAudit.id),
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    };
  }

  /** Store the signed file after the signature transaction has committed. The key is the contract and signer. */
  async finishSignedVault(prepared: PreparedContractSignature, runner?: QueryRunner) {
    const owned = !runner;
    const active = runner ?? this.dataSource.createQueryRunner();
    if (owned) {
      await active.connect();
      await active.startTransaction();
    }
    try {
      const locked = returnedRows(
        await active.query(LOCK_REQUEST_DOCUMENT_SQL, [prepared.requestId, prepared.tenantId]),
      );
      const existingId = documentIdOf(locked[0]);
      const stored = await this.documents.putSignedCopy(active.manager, {
        tenantId: prepared.tenantId,
        bookingId: prepared.bookingId,
        contractId: prepared.contractId,
        signerId: prepared.signerId,
        buffer: prepared.buffer,
        fileName: prepared.fileName,
      });
      const roster = await active.manager.getRepository(SignatureSignerEntity).find({
        where: { requestId: prepared.requestId, tenantId: prepared.tenantId },
      });
      let documentId = existingId ?? stored.id;
      if (allSignersSigned(roster) && !existingId) {
        const pdf = await this.documents.putPdfCopy(active.manager, {
          tenantId: prepared.tenantId,
          bookingId: prepared.bookingId,
          contractId: prepared.contractId,
          kind: 'signed',
          buffer: buildPlainPdf('Hợp đồng đã ký', [prepared.mergedText.slice(0, 1200), `hash:${hashDocumentText(prepared.mergedText)}`]),
          fileName: `${prepared.contractId}_signed.pdf`,
        });
        const cert = await this.documents.putPdfCopy(active.manager, {
          tenantId: prepared.tenantId,
          bookingId: prepared.bookingId,
          contractId: prepared.contractId,
          kind: 'certificate',
          buffer: buildPlainPdf('Chứng thư hoàn tất', [
            `request:${prepared.requestId}`,
            `hash:${hashDocumentText(prepared.mergedText)}`,
            `vault:${pdf.id}`,
            ...roster.map(
              (row) =>
                `${row.partyType} ${row.title ?? ''} ${row.signedAt?.toISOString() ?? ''} ${row.channel} ${row.channelDestMasked ?? ''}`,
            ),
          ]),
          fileName: `${prepared.contractId}_certificate.pdf`,
        });
        await active.query(SET_REQUEST_DOCUMENT_SQL, [prepared.requestId, prepared.tenantId, pdf.id]);
        await active.query(SET_REQUEST_CERTIFICATE_SQL, [prepared.requestId, prepared.tenantId, cert.id]);
        documentId = pdf.id;
      }
      const audits = active.manager.getRepository(AuditEventEntity);
      const row = await audits.findOne({ where: { id: prepared.auditId } });
      if (row) {
        row.payload = {
          ...(row.payload ?? {}),
          documentId,
          documentVaultRef: buildSignedDocumentRef(documentId),
          vaultStatus: 'STORED',
        };
        await audits.save(row);
      }
      if (owned) await active.commitTransaction();
      return this.signedResponse(prepared, documentId);
    } catch (error) {
      if (owned) await active.rollbackTransaction();
      throw error;
    } finally {
      if (owned) await active.release();
    }
  }

  /** Rebuild a committed signature whose vault file is still missing. Does not write another SIGNED row. */
  async rebuildPendingSignature(claims: ContractSignClaims): Promise<PreparedContractSignature> {
    const record = await this.loadContractRecord(claims.tenantId, claims.contractId);
    if (!record) throw new NotFoundException({ detail: `Contract ${claims.contractId} not found` });
    const signed = await this.auditEvents.findOne({
      where: { tenantId: claims.tenantId, entityType: 'contract', entityId: record.id, action: 'SIGNED' },
      order: { createdAt: 'DESC' },
    });
    const payload = (signed?.payload ?? {}) as Record<string, unknown>;
    const signerName = String(payload.signerName ?? '');
    const signedAt = String(payload.signedAt ?? '');
    const signatureRef = String(payload.signatureRef ?? '');
    const providerName = String(payload.provider ?? 'WEREAL_ESIGN_STUB');
    if (!signed || !signerName || !signedAt || !signatureRef) {
      throw new UnauthorizedException({ detail: 'contract sign token was already used' });
    }
    return {
      tenantId: claims.tenantId,
      contractId: record.id,
      bookingId: record.attributes.bookingId,
      signerId: claims.signerId,
      requestId: claims.requestId,
      signerName,
      signedAt,
      signatureRef,
      providerName,
      envelopeId: payload.envelopeId ? String(payload.envelopeId) : null,
      templateId: record.attributes.templateId,
      templateLabel: record.attributes.templateLabel,
      mergedText: record.attributes.mergedText,
      mergeContext: record.attributes.mergeContext,
      buffer: Buffer.from(
        signedContractText({
          mergedText: record.attributes.mergedText,
          signerName,
          signedAt,
          signatureRef,
          providerName,
        }),
        'utf8',
      ),
      fileName: `${record.id}_${claims.signerId}_signed.txt`,
      auditId: String(signed.id),
    };
  }

  private signedResponse(prepared: PreparedContractSignature, documentId: string) {
    const documentVaultRef = buildSignedDocumentRef(documentId);
    const signed: ContractDraftRecord = {
      id: prepared.contractId,
      attributes: {
        templateId: prepared.templateId,
        templateLabel: prepared.templateLabel,
        bookingId: prepared.bookingId,
        status: 'SIGNED',
        mergedText: prepared.mergedText,
        mergeContext: prepared.mergeContext,
        createdAt: prepared.signedAt,
        signedAt: prepared.signedAt,
        signedBy: prepared.signerName,
        documentId,
        documentVaultRef,
        signatureRef: prepared.signatureRef,
      },
    };
    return {
      data: signed,
      meta: { uc: ['UC-BK-07'], screen: 'SCR-BUYER-003', status: 'SIGNED' as const },
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

  private async assertSignerTurn(
    tenantId: string,
    access: ContractSignClaims,
    manager?: EntityManager,
  ): Promise<void> {
    const requests = manager
      ? manager.getRepository(SignatureRequestEntity)
      : this.dataSource.getRepository(SignatureRequestEntity);
    const signers = manager
      ? manager.getRepository(SignatureSignerEntity)
      : this.dataSource.getRepository(SignatureSignerEntity);
    const request = await requests.findOne({ where: { id: access.requestId, tenantId } });
    const roster = await signers.find({ where: { requestId: access.requestId, tenantId } });
    if (!request || roster.length === 0) return;
    const signer = roster.find((row) => row.id === access.signerId);
    if (!signer) {
      throw new UnprocessableEntityException({ detail: 'signer is not next in the signing order' });
    }
    const turn = signerTurn({
      mode: (request.signingMode as SigningMode) || 'SEQUENTIAL',
      signer,
      roster,
    });
    if (turn !== 'ok') {
      throw new UnprocessableEntityException({ detail: 'signer is not next in the signing order' });
    }
  }

  private async loadContractRecord(
    tenantId: string,
    contractId: string,
    manager?: EntityManager,
  ): Promise<ContractDraftRecord | null> {
    const audits = manager ? manager.getRepository(AuditEventEntity) : this.auditEvents;
    const draft = await audits.findOne({
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
    const signed = await audits.findOne({
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

function signedContractText(input: {
  mergedText: string;
  signerName: string;
  signedAt: string;
  signatureRef: string;
  providerName: string;
}): string {
  return [
    input.mergedText,
    '',
    '---',
    'ĐÃ KÝ ĐIỆN TỬ (UC-BK-07)',
    `Người ký: ${input.signerName}`,
    `Thời gian: ${input.signedAt}`,
    `Chữ ký số: ${input.signatureRef}`,
    `Provider: ${input.providerName}`,
  ].join('\n');
}

function documentIdOf(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const value = (row as { signed_pdf_document_id?: unknown; signedPdfDocumentId?: unknown }).signed_pdf_document_id
    ?? (row as { signedPdfDocumentId?: unknown }).signedPdfDocumentId;
  return typeof value === 'string' && value.trim() ? value : null;
}

function uniqueViolation(error: unknown): boolean {
  const row = error as { code?: string; driverError?: { code?: string } };
  return row?.code === '23505' || row?.driverError?.code === '23505';
}
