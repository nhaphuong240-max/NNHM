import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { SearchIndexService } from '../search/search-index.service';
import { AntiDriftService } from './anti-drift.service';
import type { DriftInput, DriftReport } from './anti-drift.types';
import { buildAnomalyId } from '../ai-anomaly/ai-anomaly.util';
import {
  detectDuplicateListingGroups,
  pickPrimaryListing,
} from './listing-duplicate.util';
import type { CreateListingInput } from './listing.types';
import { mapListingToApiRow } from './listing.types';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly antiDrift: AntiDriftService,
    private readonly audit: AuditService,
    private readonly searchIndex: SearchIndexService,
  ) {}

  async create(tenantId: string, input: CreateListingInput, actorId?: string) {
    const unit = await this.units.findOne({ where: { id: input.unitId, tenantId } });
    if (!unit) {
      throw new NotFoundException({ detail: `Unit ${input.unitId} not found` });
    }

    if (input.expectedUnitVersion === undefined || input.expectedUnitVersion === null) {
      throw new UnprocessableEntityException({ detail: 'expectedUnitVersion is required' });
    }

    if (unit.version !== input.expectedUnitVersion) {
      throw new ConflictException({
        type: 'https://wereal.dev/problems/version-conflict',
        title: 'Version conflict',
        detail: 'expectedUnitVersion does not match current unit version',
        expectedVersion: input.expectedUnitVersion,
        currentVersion: unit.version,
      });
    }

    const drift = this.antiDrift.evaluate(unit, { priceDisplay: input.priceDisplay });

    const count = await this.listings.count();
    const id = `ls_${String(count + 1).padStart(2, '0')}`;
    const listing = await this.listings.save({
      id,
      tenantId,
      unitId: input.unitId,
      unitVersion: unit.version,
      title: input.title,
      description: input.description,
      highlights: input.highlights ?? [],
      mediaIds: input.mediaIds ?? [],
      priceDisplay: input.priceDisplay !== undefined ? String(input.priceDisplay) : null,
      status: 'DRAFT',
      antiDriftStatus: drift.status,
      driftReport: drift as unknown as Record<string, unknown>,
      verified: false,
      rejectReason: null,
    });

    await this.audit.append({
      tenantId,
      entityType: 'listing',
      entityId: id,
      action: 'CREATE',
      payload: { unitId: input.unitId, unitVersion: unit.version, antiDriftStatus: drift.status },
      actorId: actorId ?? null,
    });

    if (drift.status === 'BLOCK') {
      await this.enqueueAntiDriftOps(tenantId, id, input.unitId, actorId);
    }

    return { data: mapListingToApiRow({ ...listing, unit }, drift) };
  }

  /** UC-GR-03 preview — wizard step before create */
  async checkDrift(tenantId: string, input: DriftInput & { unitId: string }) {
    const unit = await this.units.findOne({ where: { id: input.unitId, tenantId } });
    if (!unit) {
      throw new NotFoundException({ detail: `Unit ${input.unitId} not found` });
    }

    const drift = this.antiDrift.evaluate(unit, input);
    return {
      data: {
        unitId: input.unitId,
        unitCode: unit.code,
        basePrice: Number(unit.basePrice),
        area: Number(unit.area),
        unitStatus: unit.status,
        ...drift,
      },
    };
  }

  async list(tenantId: string, status?: ListingEntity['status']) {
    const qb = this.listings
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.unit', 'unit')
      .where('listing.tenant_id = :tenantId', { tenantId })
      .orderBy('listing.updated_at', 'DESC');

    if (status) {
      qb.andWhere('listing.status = :status', { status });
    }

    const rows = await qb.getMany();
    return {
      data: rows.map((row) => mapListingToApiRow(row)),
      meta: { count: rows.length, tenantId, status },
    };
  }

  async getById(tenantId: string, listingId: string) {
    const listing = await this.listings.findOne({
      where: { id: listingId, tenantId },
      relations: { unit: true },
    });
    if (!listing) throw new NotFoundException({ detail: 'Listing not found' });
    return { data: mapListingToApiRow(listing) };
  }

  async submitReview(tenantId: string, listingId: string, actorId?: string) {
    const listing = await this.requireListing(tenantId, listingId);
    if (listing.antiDriftStatus === 'BLOCK') {
      throw new UnprocessableEntityException({
        detail: 'Cannot submit listing with anti-drift BLOCK',
        antiDriftStatus: 'BLOCK',
      });
    }

    listing.status = 'PENDING_REVIEW';
    const saved = await this.listings.save(listing);
    await this.audit.append({
      tenantId,
      entityType: 'listing',
      entityId: listingId,
      action: 'SUBMIT_REVIEW',
      actorId: actorId ?? null,
    });
    return { data: mapListingToApiRow(saved) };
  }

  async approve(tenantId: string, listingId: string, actorId?: string) {
    const listing = await this.requireListing(tenantId, listingId, { unit: true });
    if (listing.status !== 'PENDING_REVIEW') {
      throw new UnprocessableEntityException({ detail: 'Listing must be PENDING_REVIEW' });
    }
    if (listing.antiDriftStatus === 'BLOCK') {
      throw new UnprocessableEntityException({
        detail: 'Cannot approve listing with drift BLOCK',
        antiDriftStatus: 'BLOCK',
      });
    }

    const unit = listing.unit ?? (await this.units.findOne({ where: { id: listing.unitId, tenantId } }));
    if (!unit) {
      throw new NotFoundException({ detail: `Unit ${listing.unitId} not found` });
    }
    if (listing.unitVersion !== unit.version) {
      throw new ConflictException({
        type: 'https://wereal.dev/problems/version-conflict',
        title: 'Version conflict',
        detail: 'Listing unitVersion does not match current GR version at publish commit',
        listingUnitVersion: listing.unitVersion,
        currentVersion: unit.version,
      });
    }

    listing.status = 'PUBLISHED';
    listing.verified = true;
    const saved = await this.listings.save(listing);

    await this.audit.append({
      tenantId,
      entityType: 'listing',
      entityId: listingId,
      action: 'APPROVE',
      payload: { verified: true },
      actorId: actorId ?? null,
    });

    await this.searchIndex.enqueue({
      tenantId,
      entityType: 'listing',
      entityId: listingId,
      operation: 'UPSERT',
    });

    return { data: mapListingToApiRow(saved) };
  }

  async reject(
    tenantId: string,
    listingId: string,
    reason: string,
    code?: string,
    actorId?: string,
  ) {
    const listing = await this.requireListing(tenantId, listingId);
    listing.status = 'REJECTED';
    listing.verified = false;
    listing.rejectReason = reason;

    const saved = await this.listings.save(listing);
    await this.audit.append({
      tenantId,
      entityType: 'listing',
      entityId: listingId,
      action: 'REJECT',
      payload: { reason, code },
      actorId: actorId ?? null,
    });

    return { data: mapListingToApiRow(saved) };
  }

  /** UC-LS-06 · SCR-ADMIN-009 — duplicate listing groups */
  async findDuplicateGroups(tenantId: string) {
    const rows = await this.listings.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
    const groups = detectDuplicateListingGroups(rows);
    return {
      data: groups,
      meta: { tenantId, count: groups.length, uc: ['UC-LS-06'], screen: 'SCR-ADMIN-009' },
    };
  }

  async resolveDuplicateGroup(
    tenantId: string,
    groupKey: string,
    action: 'KEEP_PRIMARY_REJECT_OTHERS',
    actorId?: string,
  ) {
    const rows = await this.listings.find({ where: { tenantId } });
    const groups = detectDuplicateListingGroups(rows);
    const group = groups.find((g) => g.groupKey === groupKey);
    if (!group) {
      throw new NotFoundException({ detail: `Duplicate group ${groupKey} not found` });
    }
    if (action !== 'KEEP_PRIMARY_REJECT_OTHERS') {
      throw new UnprocessableEntityException({ detail: 'Unsupported resolve action' });
    }

    const primaryId = pickPrimaryListing(group);
    const rejected: string[] = [];
    for (const item of group.listings) {
      if (item.id === primaryId || item.status === 'REJECTED') continue;
      await this.reject(
        tenantId,
        item.id,
        `Duplicate listing resolved — keep ${primaryId}`,
        'DUPLICATE',
        actorId,
      );
      rejected.push(item.id);
    }

    return {
      data: { groupKey, primaryId, rejectedIds: rejected },
      meta: { tenantId, action },
    };
  }

  /** T4-S2 — re-evaluate published listings after GR unit change; auto-unverify on BLOCK */
  async recheckPublishedDriftForUnit(tenantId: string, unitId: string, actorId?: string) {
    const unit = await this.units.findOne({ where: { id: unitId, tenantId } });
    if (!unit) return { unverified: [] as string[] };

    const published = await this.listings.find({
      where: { tenantId, unitId, status: 'PUBLISHED' },
    });

    const unverified: string[] = [];
    for (const listing of published) {
      const drift = this.antiDrift.evaluate(unit, {
        priceDisplay: listing.priceDisplay != null ? Number(listing.priceDisplay) : undefined,
        areaDisplay: Number(unit.area),
      });

      listing.antiDriftStatus = drift.status;
      listing.driftReport = drift as unknown as Record<string, unknown>;

      if (drift.status === 'BLOCK' && listing.verified) {
        listing.verified = false;
        unverified.push(listing.id);
        await this.enqueueAntiDriftOps(tenantId, listing.id, unitId, actorId);
        await this.audit.append({
          tenantId,
          entityType: 'listing',
          entityId: listing.id,
          action: 'AUTO_UNVERIFY',
          payload: { reason: 'GR drift BLOCK post-publish', drift },
          actorId: actorId ?? null,
        });
        await this.searchIndex.enqueue({
          tenantId,
          entityType: 'listing',
          entityId: listing.id,
          operation: 'UPSERT',
        });
      }

      await this.listings.save(listing);
    }

    return { unverified };
  }

  /** T7-S4 — anti-drift BLOCK → ops queue with ≤4h SLA */
  private async enqueueAntiDriftOps(
    tenantId: string,
    listingId: string,
    unitId: string,
    actorId?: string,
  ) {
    const slaHours = Number(process.env.ANTI_DRIFT_OPS_SLA_HOURS ?? 4);
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
    const anomalyId = buildAnomalyId(listingId, 'ANTI_DRIFT_BLOCK');

    await this.audit.append({
      tenantId,
      entityType: 'listing_anomaly',
      entityId: anomalyId,
      action: 'OPEN',
      payload: {
        listingId,
        unitId,
        signal: 'ANTI_DRIFT_BLOCK',
        slaHours,
        slaDeadline,
        queueStatus: 'OPEN',
      },
      actorId: actorId ?? null,
    });
  }

  private async requireListing(
    tenantId: string,
    listingId: string,
    relations: { unit?: boolean } = {},
  ): Promise<ListingEntity> {
    const listing = await this.listings.findOne({
      where: { id: listingId, tenantId },
      relations,
    });
    if (!listing) throw new NotFoundException({ detail: 'Listing not found' });
    return listing;
  }
}
