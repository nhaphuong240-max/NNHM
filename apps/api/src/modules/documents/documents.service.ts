import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { DocumentAccessLogEntity } from '../../database/entities/document-access-log.entity';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AuditService } from '../audit/audit.service';
import { ConsentLedgerService } from '../compliance/consent-ledger.service';
import type {
  DocumentAccessLogRecord,
  DocumentRecord,
  DownloadMeta,
  PresignDocumentInput,
  UploadDocumentInput,
} from './documents.types';
import { DOCUMENT_STORAGE_ADAPTER, type DocumentStorageAdapter } from './storage/storage.types';
import { isRetentionExpired } from './document-retention.util';

const SENSITIVE_FOLDERS = new Set(['CONTRACT', 'LEGAL']);

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
]);

function mapDocument(row: DocumentEntity): DocumentRecord {
  return {
    id: row.id,
    attributes: {
      tenantId: row.tenantId,
      entityType: row.entityType,
      entityId: row.entityId,
      folder: row.folder,
      docType: row.docType,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      contentHash: row.contentHash,
      storageProvider: row.storageProvider,
      watermarkEnabled: row.watermarkEnabled,
      scanStatus: row.scanStatus,
      retentionClass: row.retentionClass,
      version: row.version,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

function mapAccessLog(row: DocumentAccessLogEntity): DocumentAccessLogRecord {
  return {
    id: row.id,
    attributes: {
      documentId: row.documentId,
      action: row.action,
      actorId: row.actorId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file.bin';
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documents: Repository<DocumentEntity>,
    @InjectRepository(DocumentAccessLogEntity)
    private readonly accessLogs: Repository<DocumentAccessLogEntity>,
    @Inject(DOCUMENT_STORAGE_ADAPTER)
    private readonly storage: DocumentStorageAdapter,
    private readonly audit: AuditService,
    private readonly consent: ConsentLedgerService,
  ) {}

  status() {
    return {
      module: 'documents',
      uc: 'UC-TR-02',
      screen: 'SCR-DEV-006',
      rules: ['BR-08', 'BR-24'],
      storageMode: this.storage.mode,
    };
  }

  async list(
    tenantId: string,
    filters: { entityType?: string; entityId?: string; folder?: string },
  ) {
    const where: Record<string, string> = { tenantId };
    if (filters.entityType?.trim()) where.entityType = filters.entityType.trim();
    if (filters.entityId?.trim()) where.entityId = filters.entityId.trim();
    if (filters.folder?.trim()) where.folder = filters.folder.trim();

    const rows = await this.documents.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 100,
    });

    return { data: rows.map(mapDocument), meta: { tenantId, count: rows.length } };
  }

  async get(tenantId: string, documentId: string) {
    const row = await this.documents.findOne({ where: { id: documentId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `Document ${documentId} not found` });
    }
    return { data: mapDocument(row) };
  }

  async presignUpload(tenantId: string, input: PresignDocumentInput, actorId?: string) {
    const storageKey = `${input.entityType.toLowerCase()}/${input.entityId}/${Date.now()}_${sanitizeFileName(input.fileName)}`;
    const presign = await this.storage.presignUpload({
      tenantId,
      storageKey,
      mimeType: input.mimeType,
    });

    await this.audit.append({
      tenantId,
      entityType: 'document',
      entityId: storageKey,
      action: 'DOCUMENT_PRESIGN',
      payload: {
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: input.fileName,
        storageMode: this.storage.mode,
      },
      actorId: actorId ?? null,
    });

    return {
      data: presign,
      meta: {
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        folder: input.folder ?? 'LEGAL',
        docType: input.docType,
        note:
          this.storage.mode === 'local'
            ? 'Pilot: use POST /documents/upload multipart instead of presigned PUT'
            : 'Wire S3 SDK before production presigned uploads',
      },
    };
  }

  async uploadFromBuffer(
    tenantId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    input: UploadDocumentInput,
    actorId?: string,
  ) {
    if (file.size > MAX_BYTES) {
      throw new UnprocessableEntityException({
        detail: `File exceeds ${MAX_BYTES} bytes pilot limit`,
      });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new UnprocessableEntityException({
        detail: `MIME type ${file.mimetype} not allowed in pilot`,
      });
    }

    const contentHash = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.documents.findOne({
      where: { tenantId, contentHash },
    });
    if (existing) {
      return {
        data: mapDocument(existing),
        meta: { idempotentReplay: true, contentHash },
      };
    }

    const documentId = `doc_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const storageKey = `${input.entityType.toLowerCase()}/${input.entityId}/${documentId}_${sanitizeFileName(file.originalname)}`;

    const stored = await this.storage.putObject({
      tenantId,
      storageKey,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const row = await this.documents.save({
      id: documentId,
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId.trim(),
      folder: input.folder ?? 'LEGAL',
      docType: input.docType.trim(),
      fileName: sanitizeFileName(file.originalname),
      mimeType: file.mimetype,
      sizeBytes: stored.sizeBytes,
      contentHash,
      storageKey: stored.storageKey,
      storageProvider: stored.provider,
      watermarkEnabled: input.watermarkEnabled ?? true,
      scanStatus: 'CLEAN',
      retentionClass: input.retentionClass ?? '5Y',
      version: 1,
      createdBy: actorId ?? null,
    });

    await this.appendAccessLog(tenantId, row.id, 'UPLOAD', actorId, {
      fileName: row.fileName,
      sizeBytes: row.sizeBytes,
    });

    await this.audit.append({
      tenantId,
      entityType: 'document',
      entityId: row.id,
      action: 'DOCUMENT_UPLOADED',
      payload: {
        entityType: row.entityType,
        entityId: row.entityId,
        folder: row.folder,
        storageMode: this.storage.mode,
      },
      actorId: actorId ?? null,
    });

    return { data: mapDocument(row), meta: { contentHash } };
  }

  async openDownloadStream(
    tenantId: string,
    documentId: string,
    actorId?: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    row: DocumentEntity;
    meta: DownloadMeta;
  }> {
    const row = await this.documents.findOne({ where: { id: documentId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `Document ${documentId} not found` });
    }
    if (row.scanStatus === 'QUARANTINE') {
      throw new UnprocessableEntityException({ detail: 'Document quarantined — download blocked' });
    }
    if (isRetentionExpired(row.createdAt, row.retentionClass)) {
      throw new UnprocessableEntityException({
        detail: 'Document retention period expired',
        retentionClass: row.retentionClass,
      });
    }

    if (SENSITIVE_FOLDERS.has(row.folder) && actorId) {
      const hasConsent = await this.consent.hasValidConsent(
        tenantId,
        'USER',
        actorId,
        'PRIVACY',
      );
      if (!hasConsent) {
        throw new UnprocessableEntityException({
          detail: 'PDPA PRIVACY consent required for document access',
          purpose: 'PRIVACY',
          folder: row.folder,
        });
      }
    }

    const stream = await this.storage.getObjectStream({
      tenantId,
      storageKey: row.storageKey,
    });

    const watermarkLabel = row.watermarkEnabled
      ? `${tenantId} · ${actorId ?? 'anonymous'} · ${new Date().toISOString()}`
      : undefined;

    await this.appendAccessLog(tenantId, row.id, 'DOWNLOAD', actorId, {
      watermarkLabel,
      storageMode: this.storage.mode,
    });

    await this.audit.append({
      tenantId,
      entityType: 'document',
      entityId: row.id,
      action: 'DOCUMENT_DOWNLOADED',
      payload: { watermarkLabel: watermarkLabel ?? null },
      actorId: actorId ?? null,
    });

    return {
      stream,
      row,
      meta: { watermarkLabel, scanStatus: row.scanStatus },
    };
  }

  async listAccessLogs(tenantId: string, documentId: string) {
    const doc = await this.documents.findOne({ where: { id: documentId, tenantId } });
    if (!doc) {
      throw new NotFoundException({ detail: `Document ${documentId} not found` });
    }

    const rows = await this.accessLogs.find({
      where: { tenantId, documentId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return { data: rows.map(mapAccessLog), meta: { documentId, count: rows.length } };
  }

  private async appendAccessLog(
    tenantId: string,
    documentId: string,
    action: DocumentAccessLogEntity['action'],
    actorId?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    await this.accessLogs.save({
      id: `dal_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      tenantId,
      documentId,
      action,
      actorId: actorId ?? null,
      metadata: metadata ?? null,
    });
  }
}
