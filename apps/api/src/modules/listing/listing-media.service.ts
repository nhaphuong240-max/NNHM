import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { ListingMediaEntity } from '../../database/entities/listing-media.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { AuditService } from '../audit/audit.service';
import type {
  AttachListingMediaInput,
  ListingMediaRecord,
  PresignListingMediaInput,
  ReorderListingMediaInput,
} from './listing-media.types';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'media.bin';
}

function mapMedia(row: ListingMediaEntity): ListingMediaRecord {
  return {
    id: row.id,
    attributes: {
      listingId: row.listingId,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: Number(row.sizeBytes),
      sortOrder: row.sortOrder,
      isCover: row.isCover,
      scanStatus: row.scanStatus,
      url: `/api/v1/listings/${row.listingId}/media/${row.id}/file`,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

@Injectable()
export class ListingMediaService {
  constructor(
    @InjectRepository(ListingMediaEntity)
    private readonly media: Repository<ListingMediaEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private rootDir(): string {
    return this.config.get<string>('LISTING_MEDIA_LOCAL_ROOT', join(process.cwd(), 'uploads', 'listing-media'));
  }

  private absolutePath(tenantId: string, storageKey: string): string {
    return join(this.rootDir(), tenantId, storageKey);
  }

  private async ensureListing(tenantId: string, listingId: string): Promise<ListingEntity> {
    const listing = await this.listings.findOne({ where: { id: listingId, tenantId } });
    if (!listing) {
      throw new NotFoundException({ detail: `Listing ${listingId} not found` });
    }
    return listing;
  }

  private async syncListingMediaIds(tenantId: string, listingId: string) {
    const rows = await this.media.find({
      where: { tenantId, listingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const listing = await this.ensureListing(tenantId, listingId);
    listing.mediaIds = rows.map((r) => r.id);
    await this.listings.save(listing);
  }

  async list(tenantId: string, listingId: string) {
    await this.ensureListing(tenantId, listingId);
    const rows = await this.media.find({
      where: { tenantId, listingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return {
      data: rows.map(mapMedia),
      meta: { tenantId, listingId, count: rows.length, uc: ['UC-LS-04'], screen: 'SCR-AGENT-010' },
    };
  }

  async presign(tenantId: string, listingId: string, input: PresignListingMediaInput) {
    await this.ensureListing(tenantId, listingId);
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new UnprocessableEntityException({ detail: `Unsupported mime type ${input.mimeType}` });
    }

    const mediaId = `lm_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const storageKey = `${listingId}/${mediaId}_${sanitizeFileName(input.fileName)}`;

    return {
      data: {
        mediaId,
        storageKey,
        uploadUrl: `/api/v1/listings/${listingId}/media/upload`,
        method: 'POST',
        expiresIn: 900,
      },
      meta: {
        tenantId,
        listingId,
        note: 'Pilot: multipart upload to /media/upload instead of presigned PUT',
      },
    };
  }

  async upload(
    tenantId: string,
    listingId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actorId?: string,
  ) {
    await this.ensureListing(tenantId, listingId);
    if (!file?.buffer?.length) {
      throw new UnprocessableEntityException({ detail: 'file is required' });
    }
    if (file.size > MAX_BYTES) {
      throw new UnprocessableEntityException({ detail: `File exceeds ${MAX_BYTES} bytes` });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new UnprocessableEntityException({ detail: `Unsupported mime type ${file.mimetype}` });
    }

    const mediaId = `lm_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const safeName = sanitizeFileName(file.originalname);
    const storageKey = `${listingId}/${mediaId}_${safeName}`;
    const target = this.absolutePath(tenantId, storageKey);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, file.buffer);

    const count = await this.media.count({ where: { tenantId, listingId } });
    const row = await this.media.save({
      id: mediaId,
      tenantId,
      listingId,
      fileName: safeName,
      mimeType: file.mimetype,
      storageKey,
      sizeBytes: String(file.size),
      sortOrder: count,
      isCover: count === 0,
      scanStatus: 'PENDING',
    });

    await this.syncListingMediaIds(tenantId, listingId);
    await this.audit.append({
      tenantId,
      entityType: 'listing_media',
      entityId: mediaId,
      action: 'UPLOAD',
      payload: { listingId, mimeType: file.mimetype, sizeBytes: file.size },
      actorId: actorId ?? null,
    });

    return { data: mapMedia(row), meta: { scanStatus: 'PENDING' } };
  }

  async attachFromPresign(
    tenantId: string,
    listingId: string,
    input: AttachListingMediaInput,
    actorId?: string,
  ) {
    await this.ensureListing(tenantId, listingId);
    const mediaId = `lm_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const count = await this.media.count({ where: { tenantId, listingId } });
    const row = await this.media.save({
      id: mediaId,
      tenantId,
      listingId,
      fileName: sanitizeFileName(input.fileName),
      mimeType: input.mimeType,
      storageKey: input.storageKey,
      sizeBytes: String(input.sizeBytes ?? 0),
      sortOrder: count,
      isCover: count === 0,
      scanStatus: 'PENDING',
    });

    await this.syncListingMediaIds(tenantId, listingId);
    await this.audit.append({
      tenantId,
      entityType: 'listing_media',
      entityId: mediaId,
      action: 'ATTACH',
      payload: { listingId, storageKey: input.storageKey },
      actorId: actorId ?? null,
    });

    return { data: mapMedia(row) };
  }

  async getFileStream(tenantId: string, listingId: string, mediaId: string) {
    const row = await this.media.findOne({ where: { id: mediaId, tenantId, listingId } });
    if (!row) throw new NotFoundException({ detail: `Media ${mediaId} not found` });
    const target = this.absolutePath(tenantId, row.storageKey);
    if (!existsSync(target)) {
      throw new NotFoundException({ detail: `Media file missing on disk` });
    }
    return { row, target };
  }

  async deleteMedia(tenantId: string, listingId: string, mediaId: string, actorId?: string) {
    const row = await this.media.findOne({ where: { id: mediaId, tenantId, listingId } });
    if (!row) throw new NotFoundException({ detail: `Media ${mediaId} not found` });

    const target = this.absolutePath(tenantId, row.storageKey);
    if (existsSync(target)) unlinkSync(target);
    await this.media.delete({ id: mediaId, tenantId });

    if (row.isCover) {
      const next = await this.media.findOne({
        where: { tenantId, listingId },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      if (next) {
        next.isCover = true;
        await this.media.save(next);
      }
    }

    await this.syncListingMediaIds(tenantId, listingId);
    await this.audit.append({
      tenantId,
      entityType: 'listing_media',
      entityId: mediaId,
      action: 'DELETE',
      payload: { listingId },
      actorId: actorId ?? null,
    });

    return { data: { id: mediaId, deleted: true } };
  }

  async reorder(tenantId: string, listingId: string, input: ReorderListingMediaInput) {
    await this.ensureListing(tenantId, listingId);
    const ids = input.mediaIds ?? [];
    for (let i = 0; i < ids.length; i += 1) {
      await this.media.update({ id: ids[i], tenantId, listingId }, { sortOrder: i });
    }
    await this.syncListingMediaIds(tenantId, listingId);
    return this.list(tenantId, listingId);
  }

  async setCover(tenantId: string, listingId: string, mediaId: string, actorId?: string) {
    await this.ensureListing(tenantId, listingId);
    const row = await this.media.findOne({ where: { id: mediaId, tenantId, listingId } });
    if (!row) throw new NotFoundException({ detail: `Media ${mediaId} not found` });

    await this.media.update({ tenantId, listingId }, { isCover: false });
    row.isCover = true;
    await this.media.save(row);
    await this.audit.append({
      tenantId,
      entityType: 'listing_media',
      entityId: mediaId,
      action: 'SET_COVER',
      payload: { listingId },
      actorId: actorId ?? null,
    });

    return { data: mapMedia(row) };
  }

  /** Simulate virus scan webhook — PENDING → CLEAN (pilot) */
  async runScan(tenantId: string, listingId: string, mediaId: string, actorId?: string) {
    const row = await this.media.findOne({ where: { id: mediaId, tenantId, listingId } });
    if (!row) throw new NotFoundException({ detail: `Media ${mediaId} not found` });

    if (row.scanStatus === 'CLEAN') {
      return { data: mapMedia(row), meta: { idempotentReplay: true } };
    }

    row.scanStatus = 'CLEAN';
    await this.media.save(row);
    await this.audit.append({
      tenantId,
      entityType: 'listing_media',
      entityId: mediaId,
      action: 'SCAN_CLEAN',
      payload: { listingId, checksum: createHash('sha256').update(row.storageKey).digest('hex').slice(0, 16) },
      actorId: actorId ?? null,
    });

    return { data: mapMedia(row) };
  }
}
