import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DocumentStorageAdapter, PresignUploadResult, StoredObjectRef } from './storage.types';

/**
 * S3/MinIO adapter stub — swap DOCUMENTS_STORAGE=s3 when credentials ready.
 * Presign returns placeholder URL; put/get require AWS SDK wiring in production.
 */
@Injectable()
export class S3DocumentStorageAdapter implements DocumentStorageAdapter {
  readonly mode = 's3' as const;

  constructor(private readonly config: ConfigService) {}

  private bucket(): string {
    return this.config.get<string>('DOCUMENTS_S3_BUCKET', 'wereal-documents-dev');
  }

  private endpoint(): string | undefined {
    return this.config.get<string>('DOCUMENTS_S3_ENDPOINT');
  }

  private notReady(action: string): never {
    throw new ServiceUnavailableException({
      detail: `S3 storage adapter not fully wired (${action}). Set DOCUMENTS_STORAGE=local for pilot or configure DOCUMENTS_S3_* + AWS SDK.`,
    });
  }

  putObject(_input: {
    tenantId: string;
    storageKey: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObjectRef> {
    return Promise.reject(this.notReady('putObject'));
  }

  getObjectStream(_input: { tenantId: string; storageKey: string }): Promise<NodeJS.ReadableStream> {
    return Promise.reject(this.notReady('getObjectStream'));
  }

  deleteObject(_input: { tenantId: string; storageKey: string }): Promise<void> {
    return Promise.reject(this.notReady('deleteObject'));
  }

  presignUpload(input: {
    tenantId: string;
    storageKey: string;
    mimeType: string;
    expiresInSeconds?: number;
  }): Promise<PresignUploadResult> {
    const bucket = this.bucket();
    const endpoint = this.endpoint() ?? `https://${bucket}.s3.amazonaws.com`;
    const uploadUrl = `${endpoint}/${input.tenantId}/${input.storageKey}?X-Amz-Expires=${input.expiresInSeconds ?? 900}`;

    return Promise.resolve({
      uploadUrl,
      storageKey: input.storageKey,
      provider: 'S3',
      expiresIn: input.expiresInSeconds ?? 900,
      method: 'PUT',
      headers: { 'Content-Type': input.mimeType },
    });
  }
}
