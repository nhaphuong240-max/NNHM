import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { SearchIndexService } from './search-index.service';
import { rankRecommendations } from './search-recommend.util';

export interface SearchUnitsQuery {
  tenantId: string;
  q?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
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
    private readonly searchIndex: SearchIndexService,
  ) {}

  /** API-039 GET /search/units — UC-LS-01 via search index (UC-LS-07) */
  async searchUnits(query: SearchUnitsQuery) {
    const limit = Math.min(query.limit ?? 50, 100);

    const qb = this.indexDocs
      .createQueryBuilder('doc')
      .where('doc.tenant_id = :tenantId', { tenantId: query.tenantId })
      .orderBy('doc.updated_at', 'DESC')
      .take(limit);

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

    const rows = await qb.getMany();

    const bedroomCounts = new Map<number, number>();
    for (const doc of rows) {
      bedroomCounts.set(doc.bedrooms, (bedroomCounts.get(doc.bedrooms) ?? 0) + 1);
    }

    const status = await this.searchIndex.getStatus(query.tenantId);

    const data = rows.map((doc) => ({
      id: doc.id,
      listingId: doc.listingId,
      attributes: {
        code: doc.code,
        projectName: doc.projectName,
        basePrice: Number(doc.basePrice),
        bedrooms: doc.bedrooms,
        area: Number(doc.area),
        title: doc.title,
        verified: doc.verified,
        thumbnailUrl: null,
      },
    }));

    return {
      data,
      meta: {
        count: data.length,
        source: 'search-index',
        indexLagMs: status.lagMs,
        facets: {
          bedrooms: [...bedroomCounts.entries()].map(([value, count]) => ({ value, count })),
        },
      },
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
          thumbnailUrl: null,
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
