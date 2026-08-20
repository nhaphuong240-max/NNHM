import type {
  DocumentEntityType,
  DocumentFolder,
  DocumentScanStatus,
  DocumentStorageProvider,
} from '../../database/entities/document.entity';
import type { DocumentAccessAction } from '../../database/entities/document-access-log.entity';

export interface DocumentRecord {
  id: string;
  attributes: {
    tenantId: string;
    entityType: DocumentEntityType;
    entityId: string;
    folder: DocumentFolder;
    docType: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    contentHash: string;
    storageProvider: DocumentStorageProvider;
    watermarkEnabled: boolean;
    scanStatus: DocumentScanStatus;
    retentionClass: string;
    version: number;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface DocumentAccessLogRecord {
  id: string;
  attributes: {
    documentId: string;
    action: DocumentAccessAction;
    actorId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  };
}

export interface UploadDocumentInput {
  entityType: DocumentEntityType;
  entityId: string;
  folder?: DocumentFolder;
  docType: string;
  retentionClass?: string;
  watermarkEnabled?: boolean;
}

export interface PresignDocumentInput {
  entityType: DocumentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  folder?: DocumentFolder;
  docType: string;
}

export interface DownloadMeta {
  watermarkLabel?: string;
  scanStatus: DocumentScanStatus;
}
