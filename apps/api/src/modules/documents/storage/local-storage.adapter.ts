import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { DocumentStorageAdapter, PresignUploadResult, StoredObjectRef } from './storage.types';

@Injectable()
export class LocalDocumentStorageAdapter implements DocumentStorageAdapter {
  readonly mode = 'local' as const;

  constructor(private readonly config: ConfigService) {}

  private rootDir(): string {
    return this.config.get<string>('DOCUMENTS_LOCAL_ROOT', join(process.cwd(), 'uploads'));
  }

  private absolutePath(tenantId: string, storageKey: string): string {
    return join(this.rootDir(), tenantId, storageKey);
  }

  putObject(input: {
    tenantId: string;
    storageKey: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredObjectRef> {
    void input.mimeType;
    const target = this.absolutePath(input.tenantId, input.storageKey);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, input.buffer);
    return Promise.resolve({
      storageKey: input.storageKey,
      provider: 'LOCAL',
      sizeBytes: input.buffer.length,
    });
  }

  getObjectStream(input: { tenantId: string; storageKey: string }): Promise<NodeJS.ReadableStream> {
    const target = this.absolutePath(input.tenantId, input.storageKey);
    if (!existsSync(target)) {
      throw new NotFoundException({ detail: `Stored object ${input.storageKey} not found on disk` });
    }
    return Promise.resolve(createReadStream(target));
  }

  deleteObject(input: { tenantId: string; storageKey: string }): Promise<void> {
    const target = this.absolutePath(input.tenantId, input.storageKey);
    if (existsSync(target)) {
      unlinkSync(target);
    }
    return Promise.resolve();
  }

  presignUpload(input: {
    tenantId: string;
    storageKey: string;
    mimeType: string;
    expiresInSeconds?: number;
  }): Promise<PresignUploadResult> {
    return Promise.resolve({
      uploadUrl: `/api/v1/documents/upload-direct?storageKey=${encodeURIComponent(input.storageKey)}`,
      storageKey: input.storageKey,
      provider: 'LOCAL',
      expiresIn: input.expiresInSeconds ?? 900,
      method: 'POST',
      headers: { 'Content-Type': input.mimeType },
    });
  }
}
