export type DocumentStorageMode = 'local' | 's3';

export interface StoredObjectRef {
  storageKey: string;
  provider: 'LOCAL' | 'S3';
  sizeBytes: number;
}

export interface PresignUploadResult {
  uploadUrl: string;
  storageKey: string;
  provider: 'LOCAL' | 'S3';
  expiresIn: number;
  method: 'PUT' | 'POST';
  headers?: Record<string, string>;
}

export interface DocumentStorageAdapter {
  readonly mode: DocumentStorageMode;

  putObject(input: {
    tenantId: string;
    storageKey: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObjectRef>;

  getObjectStream(input: { tenantId: string; storageKey: string }): Promise<NodeJS.ReadableStream>;

  deleteObject(input: { tenantId: string; storageKey: string }): Promise<void>;

  presignUpload(input: {
    tenantId: string;
    storageKey: string;
    mimeType: string;
    expiresInSeconds?: number;
  }): Promise<PresignUploadResult>;
}

export const DOCUMENT_STORAGE_ADAPTER = Symbol('DOCUMENT_STORAGE_ADAPTER');
