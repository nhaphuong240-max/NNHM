import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mediaCdnBaseFromEnv, resolveMediaPublicUrl } from '../../common/media-cdn.util';
import { ListingMediaEntity } from '../../database/entities/listing-media.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import {
  groupBuildingsFromPins,
  mapCenterForProject,
  unitToMapPin,
} from '../portal/public-map.util';
import { mapDocToSearchHit } from './search-doc.mapper';
import { SearchIndexService } from './search-index.service';
import { rankRecommendations } from './search-recommend.util';
import { buildZeroResultSuggestions } from './search-zero-result.util';
import type { SearchTransactionType } from './search-transaction-type.util';

export type SearchSort = 'relevance' | 'newest' | 'price' | 'area' | 'verified_first';

export interface SearchUnitsQuery {
  tenantId: string;
  q?: string;
  district?: string;
  city?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  transactionType?: SearchTransactionType;
  sort?: SearchSort;
}

export interface RecommendUnitsQuery {
  tenantId: string;
  seedUnitId?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(SearchIndexDocEntity)
    private readonly indexDocs: Repository<SearchIndexDocEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(ListingMediaEntity)
    private readonly listingMedia: Repository<ListingMediaEntity>,
    private readonly searchIndex: SearchIndexService,
  ) {}

  private cdnMediaUrl(url: string | null | undefined) {
    return resolveMediaPublicUrl(url, mediaCdnBaseFromEnv(process.env));
  }

  private mapHit(doc: SearchIndexDocEntity) {
    const hit = mapDocToSearchHit(doc);
    hit.attributes.thumbnailUrl = this.cdnMediaUrl(hit.attributes.thumbnailUrl);
    return hit;
  }

  /** API-039 GET /search/units — UC-LS-01 via search index (UC-LS-07) */
  async searchUnits(query: SearchUnitsQuery) {
    const limit = Math.min(query.limit ?? 50, 100);

    const qb = this.indexDocs
      .createQueryBuilder('doc')
      .where('doc.tenant_id = :tenantId', { tenantId: query.tenantId })
      .take(limit);

    if (query.transactionType) {
      qb.andWhere('doc.transaction_type = :transactionType', {
        transactionType: query.transactionType,
      });
    }

    switch (query.sort ?? 'newest') {
      case 'price':
        qb.orderBy('CAST(doc.base_price AS BIGINT)', 'ASC');
        break;
      case 'area':
        qb.orderBy('CAST(doc.area AS NUMERIC)', 'DESC');
        break;
      case 'verified_first':
        qb.orderBy('doc.verified', 'DESC').addOrderBy('doc.updated_at', 'DESC');
        break;
      case 'relevance':
        if (query.q?.trim()) {
          qb.orderBy('doc.updated_at', 'DESC');
        } else {
          qb.orderBy('doc.updated_at', 'DESC');
        }
        break;
      default:
        qb.orderBy('doc.updated_at', 'DESC');
    }

    if (query.bedrooms !== undefined) {
      qb.andWhere('doc.bedrooms = :bedrooms', { bedrooms: query.bedrooms });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('CAST(doc.base_price AS BIGINT) >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('CAST(doc.base_price AS BIGINT) <= :maxPrice', { maxPrice: query.maxPrice });
    }
    if (query.q?.trim()) {
      qb.andWhere('doc.search_text ILIKE :q', { q: `%${query.q.trim().toLowerCase()}%` });
    }
    if (query.district?.trim()) {
      qb.andWhere('doc.district = :district', { district: query.district.trim() });
    }
    if (query.city?.trim()) {
      qb.andWhere('doc.city = :city', { city: query.city.trim() });
    }

    const rows = await qb.getMany();

    const bedroomCounts = new Map<number, number>();
    const districtCounts = new Map<string, number>();
    for (const doc of rows) {
      bedroomCounts.set(doc.bedrooms, (bedroomCounts.get(doc.bedrooms) ?? 0) + 1);
      if (doc.district) {
        districtCounts.set(doc.district, (districtCounts.get(doc.district) ?? 0) + 1);
      }
    }

    const status = await this.searchIndex.getStatus(query.tenantId);

    const data = rows.map((doc) => this.mapHit(doc));

    const zeroResult = data.length === 0;
    const suggestions = zeroResult ? buildZeroResultSuggestions(query) : [];

    return {
      data,
      meta: {
        count: data.length,
        source: 'search-index',
        indexLagMs: status.lagMs,
        zeroResult,
        suggestions: suggestions.map((s) => ({
          label: s.label,
          params: {
            transactionType: s.query.transactionType,
            district: s.query.district,
            bedrooms: s.query.bedrooms,
            minPrice: s.query.minPrice,
            maxPrice: s.query.maxPrice,
            q: s.query.q,
          },
        })),
        facets: {
          bedrooms: [...bedroomCounts.entries()].map(([value, count]) => ({ value, count })),
          districts: [...districtCounts.entries()].map(([value, count]) => ({ value, count })),
        },
      },
    };
  }

  /** P1 — trust strip metrics for public homepage / SERP */
  async searchStats(tenantId: string) {
    const [total, verified, latest] = await Promise.all([
      this.indexDocs.count({ where: { tenantId } }),
      this.indexDocs.count({ where: { tenantId, verified: true } }),
      this.indexDocs.findOne({ where: { tenantId }, order: { indexedAt: 'DESC' } }),
    ]);
    return {
      data: {
        totalListings: total,
        verifiedListings: verified,
        lastIndexedAt: latest?.indexedAt?.toISOString() ?? null,
      },
      meta: { tenantId, source: 'search-index' },
    };
  }

  /** API-040 GET /search/units/{unitId} — UC-LS-05 public unit detail */
  async getUnitDetail(tenantId: string, unitId: string) {
    const doc = await this.indexDocs.findOne({ where: { id: unitId, tenantId } });
    if (!doc) {
      throw new NotFoundException({
        detail: `Published listing for unit ${unitId} not found`,
      });
    }

    return {
      data: {
        id: doc.id,
        listingId: doc.detail.listingId,
        attributes: {
          code: doc.code,
          projectName: doc.projectName,
          projectId: doc.detail.projectId,
          title: doc.title,
          description: doc.detail.description,
          highlights: doc.detail.highlights,
          basePrice: Number(doc.basePrice),
          priceDisplay: doc.detail.priceDisplay,
          bedrooms: doc.bedrooms,
          floor: doc.detail.floor,
          area: Number(doc.area),
          unitStatus: doc.detail.unitStatus,
          verified: doc.verified,
          antiDriftStatus: doc.detail.antiDriftStatus,
          thumbnailUrl: this.cdnMediaUrl(doc.thumbnailUrl),
          city: doc.city,
          district: doc.district,
        },
      },
      meta: {
        tenantId,
        source: 'search-index',
        indexedAt: doc.indexedAt.toISOString(),
        privacyPolicyVersion: '2026-07-01',
      },
    };
  }

  indexStatus(tenantId: string) {
    return this.searchIndex.getStatus(tenantId);
  }

  /** P2 — public project page: listings + price range */
  async getProjectDetail(tenantId: string, projectId: string) {
    const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
    if (!project) {
      throw new NotFoundException({ detail: `Project ${projectId} not found` });
    }

    const docs = await this.indexDocs
      .createQueryBuilder('doc')
      .where('doc.tenant_id = :tenantId', { tenantId })
      .andWhere("doc.detail->>'projectId' = :projectId", { projectId })
      .orderBy('CAST(doc.base_price AS BIGINT)', 'ASC')
      .getMany();

    const prices = docs.map((d) => Number(d.basePrice));
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const center = mapCenterForProject(projectId);

    return {
      data: {
        id: project.id,
        attributes: {
          name: project.name,
          code: project.code,
          city: project.city,
          district: project.district,
          unitCount: docs.length,
          verifiedCount: docs.filter((d) => d.verified).length,
          minPrice,
          maxPrice,
          mapCenter: center,
        },
        listings: docs.map((doc) => this.mapHit(doc)),
      },
      meta: { tenantId, source: 'search-index', screen: 'SCR-PUBLIC-007' },
    };
  }

  /** P2 — map pins from published search index */
  async getMapFromIndex(tenantId: string, projectId?: string) {
    const qb = this.indexDocs
      .createQueryBuilder('doc')
      .where('doc.tenant_id = :tenantId', { tenantId })
      .orderBy('doc.code', 'ASC')
      .take(60);

    if (projectId?.trim()) {
      qb.andWhere("doc.detail->>'projectId' = :projectId", { projectId: projectId.trim() });
    }

    const docs = await qb.getMany();
    const hasGoldenRecord = docs.some((d) => d.latitude && d.longitude);
    const pins = docs.map((doc, idx) => {
      if (doc.latitude && doc.longitude) {
        return {
          unitId: doc.id,
          listingId: doc.listingId,
          code: doc.code,
          label: `${doc.code} · ${doc.bedrooms}PN`,
          lat: Number(doc.latitude),
          lng: Number(doc.longitude),
          basePrice: Number(doc.basePrice),
          status: doc.detail.unitStatus,
          bedrooms: doc.bedrooms,
          area: Number(doc.area),
          tower: doc.detail.projectId,
          floor: doc.detail.floor,
          heightM: Math.max(12, doc.detail.floor * 3.2),
          thumbnailUrl: this.cdnMediaUrl(doc.thumbnailUrl),
          verified: doc.verified,
          projectId: doc.detail.projectId,
        };
      }
      return unitToMapPin(
        {
          id: doc.id,
          code: doc.code,
          basePrice: Number(doc.basePrice),
          status: doc.detail.unitStatus,
          bedrooms: doc.bedrooms,
          area: Number(doc.area),
          floor: doc.detail.floor,
          projectId: doc.detail.projectId,
          thumbnailUrl: this.cdnMediaUrl(doc.thumbnailUrl),
          verified: doc.verified,
          listingId: doc.listingId,
        },
        idx,
      );
    });

    const firstGr = docs.find((d) => d.latitude && d.longitude);
    const center = firstGr
      ? {
          lat: Number(firstGr.latitude),
          lng: Number(firstGr.longitude),
          label: firstGr.projectName,
        }
      : mapCenterForProject(projectId ?? docs[0]?.detail.projectId);

    return {
      data: {
        projectId: projectId ?? null,
        center: { lat: center.lat, lng: center.lng, label: center.label },
        pins,
        buildings: groupBuildingsFromPins(pins),
        mode: hasGoldenRecord ? 'golden-record' : 'search-index-synthetic',
      },
      meta: { tenantId, count: pins.length, uc: ['UC-UX-06'], screen: 'SCR-PUBLIC-003' },
    };
  }

  /** P2 — gallery media for published unit listing */
  async getUnitMedia(tenantId: string, unitId: string) {
    const doc = await this.indexDocs.findOne({ where: { id: unitId, tenantId } });
    if (!doc) {
      throw new NotFoundException({ detail: `Published listing for unit ${unitId} not found` });
    }

    const rows = await this.listingMedia.find({
      where: { tenantId, listingId: doc.listingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        attributes: {
          url: this.cdnMediaUrl(`/api/v1/listings/${doc.listingId}/media/${row.id}/file`)!,
          isCover: row.isCover,
          mimeType: row.mimeType,
        },
      })),
      meta: { unitId, listingId: doc.listingId, count: rows.length },
    };
  }

  /** UC-AI-06 · GET /search/recommendations — buyer-product matching stub */
  async recommendUnits(query: RecommendUnitsQuery) {
    const limit = Math.min(query.limit ?? 6, 12);
    const seed = query.seedUnitId
      ? await this.indexDocs.findOne({
          where: { id: query.seedUnitId.trim(), tenantId: query.tenantId },
        })
      : null;

    const candidates = await this.indexDocs.find({
      where: { tenantId: query.tenantId },
      order: { updatedAt: 'DESC' },
      take: 100,
    });

    const preferences = {
      bedrooms: query.bedrooms ?? seed?.bedrooms,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice ?? (seed ? Math.round(Number(seed.basePrice) * 1.2) : undefined),
    };

    const data = rankRecommendations(candidates, seed, preferences, limit);

    return {
      data,
      meta: {
        count: data.length,
        tenantId: query.tenantId,
        seedUnitId: seed?.id ?? null,
        preferences,
        uc: ['UC-AI-06'],
        screen: 'SCR-PUBLIC-003',
        source: 'search-index-matching',
      },
    };
  }
}
