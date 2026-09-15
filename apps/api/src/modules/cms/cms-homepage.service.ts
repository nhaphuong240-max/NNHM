import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mediaCdnBaseFromEnv, resolveMediaPublicUrl } from '../../common/media-cdn.util';
import { CmsHomepageConfigEntity } from '../../database/entities/cms-homepage-config.entity';
import { GeoAreaEntity } from '../../database/entities/geo-area.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { mapCenterForProject } from '../portal/public-map.util';
import { mapDocToSearchHit } from '../search/search-doc.mapper';
import {
  DEFAULT_HOMEPAGE_CONFIG,
  type HomepageConfigPayload,
  type HomepageFeaturedProjectMeta,
} from './homepage.types';

/** FR-CNT-004 / Phase Homepage — CMS-managed homepage pack for public + admin. */
@Injectable()
export class CmsHomepageService {
  constructor(
    @InjectRepository(CmsHomepageConfigEntity)
    private readonly configs: Repository<CmsHomepageConfigEntity>,
    @InjectRepository(GeoAreaEntity)
    private readonly areas: Repository<GeoAreaEntity>,
    @InjectRepository(SearchIndexDocEntity)
    private readonly indexDocs: Repository<SearchIndexDocEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
  ) {}

  private cdn(url: string | null | undefined) {
    return resolveMediaPublicUrl(url, mediaCdnBaseFromEnv(process.env));
  }

  async getConfig(tenantId: string): Promise<HomepageConfigPayload> {
    const row = await this.configs.findOne({ where: { tenantId } });
    return row?.payload ?? DEFAULT_HOMEPAGE_CONFIG;
  }

  async updateConfig(tenantId: string, payload: HomepageConfigPayload, actorId?: string) {
    let row = await this.configs.findOne({ where: { tenantId } });
    if (!row) {
      row = this.configs.create({ tenantId, payload, updatedBy: actorId ?? null });
    } else {
      row.payload = payload;
      row.updatedBy = actorId ?? null;
    }
    await this.configs.save(row);
    return { data: row.payload, meta: { tenantId, updatedAt: row.updatedAt.toISOString() } };
  }

  async getHomepagePack(tenantId: string) {
    const config = await this.getConfig(tenantId);
    const limit = Math.min(config.picksLimit ?? 6, 12);

    const [statsTotal, statsVerified, pickDocs, areaRows] = await Promise.all([
      this.indexDocs.count({ where: { tenantId } }),
      this.indexDocs.count({ where: { tenantId, verified: true } }),
      this.indexDocs.find({
        where: { tenantId },
        order: { indexedAt: 'DESC' },
        take: limit,
      }),
      this.areas.find({ where: { tenantId }, order: { city: 'ASC', label: 'ASC' } }),
    ]);

    const picks = pickDocs.map((doc) => {
      const hit = mapDocToSearchHit(doc);
      hit.attributes.thumbnailUrl = this.cdn(hit.attributes.thumbnailUrl);
      return hit;
    });

    const districtCounts = await Promise.all(
      areaRows.map(async (area) => {
        const listingCount = await this.indexDocs.count({
          where: { tenantId, district: area.label },
        });
        return {
          id: area.id,
          slug: area.slug,
          label: area.label,
          city: area.city,
          listingCount,
        };
      }),
    );

    const featuredProjects = await this.resolveFeaturedProjects(tenantId, config.featuredProjects);

    return {
      data: {
        config,
        stats: {
          totalListings: statsTotal,
          verifiedListings: statsVerified,
          hasLiveListings: statsTotal > 0,
        },
        picks,
        districts: districtCounts,
        featuredProjects,
      },
      meta: {
        tenantId,
        fr: 'FR-CNT-004',
        screen: 'SCR-PUBLIC-001',
        source: 'cms-homepage',
      },
    };
  }

  private async resolveFeaturedProjects(
    tenantId: string,
    metas: HomepageFeaturedProjectMeta[],
  ) {
    const sorted = [...metas].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const slides = await Promise.all(
      sorted.map(async (meta) => {
        const project = await this.projects.findOne({
          where: { id: meta.projectId, tenantId },
        });
        if (!project) return null;

        const docs = await this.indexDocs
          .createQueryBuilder('doc')
          .where('doc.tenant_id = :tenantId', { tenantId })
          .andWhere("doc.detail->>'projectId' = :projectId", { projectId: meta.projectId })
          .orderBy('CAST(doc.base_price AS BIGINT)', 'ASC')
          .getMany();

        const prices = docs.map((d) => Number(d.basePrice));
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;
        const cover = docs.find((d) => d.thumbnailUrl)?.thumbnailUrl ?? null;

        return {
          id: project.id,
          name: project.name,
          code: project.code,
          city: project.city ?? '',
          district: project.district ?? '',
          unitCount: docs.length,
          verifiedCount: docs.filter((d) => d.verified).length,
          minPrice,
          maxPrice,
          thumbnailUrl: this.cdn(typeof cover === 'string' ? cover : null),
          developer: meta.developer ?? 'Chủ đầu tư',
          tagline:
            meta.tagline ??
            `${docs.length} căn trên bảng hàng — xem chi tiết dự án.`,
          art: meta.art ?? 'tower',
          mapCenter: mapCenterForProject(project.id),
        };
      }),
    );

    return slides.filter((s): s is NonNullable<typeof s> => s !== null);
  }
}
