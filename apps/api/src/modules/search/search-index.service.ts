import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ListingMediaEntity } from '../../database/entities/listing-media.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import {
  SearchIndexDetail,
  SearchIndexDocEntity,
} from '../../database/entities/search-index-doc.entity';
import {
  SearchOutboxEntity,
  SearchOutboxOperation,
} from '../../database/entities/search-outbox.entity';
import { UnitEntity } from '../../database/entities/unit.entity';

export type SearchIndexEnqueueInput = {
  tenantId: string;
  entityType: 'listing' | 'unit';
  entityId: string;
  operation: SearchOutboxOperation;
  payload?: Record<string, unknown>;
};

@Injectable()
export class SearchIndexService {
  private readonly logger = new Logger(SearchIndexService.name);

  constructor(
    @InjectRepository(SearchOutboxEntity)
    private readonly outbox: Repository<SearchOutboxEntity>,
    @InjectRepository(SearchIndexDocEntity)
    private readonly docs: Repository<SearchIndexDocEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(ListingMediaEntity)
    private readonly listingMedia: Repository<ListingMediaEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
  ) {}

  async enqueue(input: SearchIndexEnqueueInput) {
    const row = await this.outbox.save({
      id: `out_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      payload: input.payload ?? null,
      status: 'PENDING',
      attempts: 0,
      lastError: null,
      processedAt: null,
    });

    await this.processOne(row.id);
    return row;
  }

  async processPending(limit = 50) {
    const pending = await this.outbox.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    let processed = 0;
    for (const row of pending) {
      await this.processOne(row.id);
      processed += 1;
    }
    return processed;
  }

  async processOne(outboxId: string) {
    const row = await this.outbox.findOne({ where: { id: outboxId } });
    if (!row || row.status !== 'PENDING') return;

    const started = Date.now();
    try {
      if (row.operation === 'DELETE') {
        const unitId = String(row.payload?.unitId ?? row.entityId);
        await this.docs.delete({ id: unitId, tenantId: row.tenantId });
      } else if (row.entityType === 'listing') {
        await this.syncListing(row.tenantId, row.entityId);
      } else {
        await this.syncUnit(row.tenantId, row.entityId);
      }

      row.status = 'PROCESSED';
      row.processedAt = new Date();
      row.lastError = null;
      await this.outbox.save(row);

      if (row.createdAt) {
        const lagMs = Date.now() - row.createdAt.getTime();
        this.logger.debug(
          `Search index ${row.operation} ${row.entityType}/${row.entityId} lag=${lagMs}ms`,
        );
      }
    } catch (err) {
      row.attempts += 1;
      row.lastError = err instanceof Error ? err.message : String(err);
      row.status = row.attempts >= 5 ? 'FAILED' : 'PENDING';
      await this.outbox.save(row);
      this.logger.warn(`Search outbox ${row.id} failed (attempt ${row.attempts}): ${row.lastError}`);
    }
  }

  async rebuildPublished(tenantId: string) {
    const published = await this.listings.find({
      where: { tenantId, status: 'PUBLISHED' },
    });

    for (const listing of published) {
      await this.enqueue({
        tenantId,
        entityType: 'listing',
        entityId: listing.id,
        operation: 'UPSERT',
      });
    }

    return published.length;
  }

  async countIndexablePublished(tenantId: string) {
    const published = await this.listings.find({
      where: { tenantId, status: 'PUBLISHED', antiDriftStatus: 'PASS' },
      relations: { unit: true },
    });
    return published.filter((l) => l.unit && l.unit.status !== 'SOLD').length;
  }

  async getStatus(tenantId: string) {
    const [docCount, pendingCount, failedCount, latestDoc, oldestPending] = await Promise.all([
      this.docs.count({ where: { tenantId } }),
      this.outbox.count({ where: { tenantId, status: 'PENDING' } }),
      this.outbox.count({ where: { tenantId, status: 'FAILED' } }),
      this.docs.findOne({
        where: { tenantId },
        order: { indexedAt: 'DESC' },
      }),
      this.outbox.findOne({
        where: { tenantId, status: 'PENDING' },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const lagMs = oldestPending
      ? Date.now() - oldestPending.createdAt.getTime()
      : latestDoc
        ? Date.now() - latestDoc.indexedAt.getTime()
        : 0;

    return {
      tenantId,
      docCount,
      outbox: { pending: pendingCount, failed: failedCount },
      lagMs,
      p95TargetMs: 5000,
      healthy: pendingCount === 0 && lagMs <= 5000,
      lastIndexedAt: latestDoc?.indexedAt?.toISOString() ?? null,
      source: 'postgres-search-index',
    };
  }

  private async syncListing(tenantId: string, listingId: string) {
    const listing = await this.listings.findOne({
      where: { id: listingId, tenantId },
      relations: { unit: true },
    });

    if (!listing?.unit) {
      await this.docs.delete({ id: listing?.unitId ?? listingId, tenantId });
      return;
    }

    if (!this.isIndexable(listing, listing.unit)) {
      await this.docs.delete({ id: listing.unitId, tenantId });
      return;
    }

    await this.upsertDoc(listing, listing.unit);
  }

  private async syncUnit(tenantId: string, unitId: string) {
    const unit = await this.units.findOne({ where: { id: unitId, tenantId } });
    if (!unit) {
      await this.docs.delete({ id: unitId, tenantId });
      return;
    }

    if (unit.status === 'SOLD') {
      await this.docs.delete({ id: unitId, tenantId });
      return;
    }

    const rows = await this.listings.find({
      where: { tenantId, unitId, status: 'PUBLISHED' },
      relations: { unit: true },
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    const listing = rows[0];

    if (!listing?.unit || !this.isIndexable(listing, listing.unit)) {
      await this.docs.delete({ id: unitId, tenantId });
      return;
    }

    await this.upsertDoc(listing, listing.unit);
  }

  private isIndexable(listing: ListingEntity, unit: UnitEntity) {
    return (
      listing.status === 'PUBLISHED' &&
      listing.antiDriftStatus !== 'BLOCK' &&
      unit.status !== 'SOLD'
    );
  }

  private async upsertDoc(listing: ListingEntity, unit: UnitEntity) {
    const project = await this.projects.findOne({
      where: { id: unit.projectId, tenantId: listing.tenantId },
    });

    const detail: SearchIndexDetail = {
      listingId: listing.id,
      description: listing.description,
      highlights: listing.highlights ?? [],
      priceDisplay: listing.priceDisplay ? Number(listing.priceDisplay) : null,
      floor: unit.floor ?? 0,
      unitStatus: unit.status,
      antiDriftStatus: listing.antiDriftStatus,
      projectId: unit.projectId,
    };

    const searchText = [
      listing.title,
      unit.code,
      project?.name ?? '',
      project?.city ?? '',
      project?.district ?? '',
      listing.description,
    ]
      .join(' ')
      .toLowerCase();

    const thumbnailUrl = await this.resolveCoverUrl(listing);

    const now = new Date();
    await this.docs.save({
      id: unit.id,
      tenantId: listing.tenantId,
      listingId: listing.id,
      projectName: project?.name ?? 'Sunrise Tower A',
      title: listing.title,
      code: unit.code,
      basePrice: unit.basePrice,
      bedrooms: unit.bedrooms,
      area: unit.area,
      verified: listing.verified,
      city: project?.city ?? null,
      district: project?.district ?? null,
      thumbnailUrl,
      searchText,
      detail,
      indexedAt: now,
      updatedAt: now,
    });
  }

  private async resolveCoverUrl(listing: ListingEntity): Promise<string | null> {
    const coverId = listing.mediaIds?.[0];
    if (!coverId) {
      const cover = await this.listingMedia.findOne({
        where: { tenantId: listing.tenantId, listingId: listing.id, isCover: true },
        order: { sortOrder: 'ASC' },
      });
      if (!cover) return null;
      return `/api/v1/listings/${listing.id}/media/${cover.id}/file`;
    }
    return `/api/v1/listings/${listing.id}/media/${coverId}/file`;
  }
}
