import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeoAreaEntity } from '../../database/entities/geo-area.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';

export type LocalityInsight = {
  district: string;
  city: string;
  slug?: string;
  listingCount: number;
  avgPricePerSqm: number | null;
  minPricePerSqm: number | null;
  maxPricePerSqm: number | null;
  medianPrice: number | null;
  narrative: string;
  source: string;
  asOf: string;
  sampleSize: number;
};

const INSIGHT_SOURCE = 'Golden Record search_index_docs (verified listings only)';

/** P2 FR-MI-002 — grounded locality price/m² insight with source + date. */
@Injectable()
export class LocalityInsightService {
  constructor(
    @InjectRepository(SearchIndexDocEntity)
    private readonly index: Repository<SearchIndexDocEntity>,
    @InjectRepository(GeoAreaEntity)
    private readonly areas: Repository<GeoAreaEntity>,
  ) {}

  async insightByDistrict(tenantId: string, district: string, city?: string) {
    const qb = this.index
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.district = :district', { district })
      .andWhere('d.transaction_type = :tx', { tx: 'sale' })
      .andWhere('d.verified = true');

    if (city) {
      qb.andWhere('d.city = :city', { city });
    }

    const docs = await qb.getMany();
    return this.buildInsight(tenantId, district, city ?? docs[0]?.city ?? '', docs);
  }

  async insightBySlug(tenantId: string, slug: string) {
    const area = await this.areas.findOne({ where: { tenantId, slug } });
    if (!area) {
      return { data: null, meta: { tenantId, fr: 'FR-MI-002', notFound: true } };
    }
    const insight = await this.insightByDistrict(tenantId, area.label, area.city);
    insight.data.slug = slug;
    return insight;
  }

  async listDistrictInsights(tenantId: string) {
    const areas = await this.areas.find({
      where: { tenantId, isIndexable: true },
      order: { label: 'ASC' },
    });

    const results: LocalityInsight[] = [];
    for (const area of areas) {
      const { data } = await this.insightByDistrict(tenantId, area.label, area.city);
      if (data) {
        results.push({ ...data, slug: area.slug });
      }
    }

    return {
      data: results,
      meta: { tenantId, fr: 'FR-MI-002', count: results.length },
    };
  }

  private async buildInsight(
    tenantId: string,
    district: string,
    city: string,
    docs: SearchIndexDocEntity[],
  ) {
    const pricesPerSqm: number[] = [];
    const prices: number[] = [];
    let latestIndexed = new Date(0);

    for (const doc of docs) {
      const price = Number(doc.basePrice);
      const area = Number(doc.area);
      if (price > 0) prices.push(price);
      if (price > 0 && area > 0) {
        pricesPerSqm.push(Math.round(price / area));
      }
      if (doc.indexedAt > latestIndexed) latestIndexed = doc.indexedAt;
    }

    const sampleSize = pricesPerSqm.length;
    const avg =
      sampleSize > 0
        ? Math.round(pricesPerSqm.reduce((a, b) => a + b, 0) / sampleSize)
        : null;
    const sorted = [...pricesPerSqm].sort((a, b) => a - b);
    const median =
      sampleSize > 0
        ? sorted[Math.floor(sampleSize / 2)]!
        : null;

    const asOf = sampleSize > 0 ? latestIndexed.toISOString() : new Date().toISOString();

    const narrative =
      sampleSize >= 3 && avg
        ? `Khu vực ${district}${city ? `, ${city}` : ''}: giá trung bình khoảng ${this.formatVndPerSqm(avg)}/m² ` +
          `(n=${sampleSize} căn verified, cập nhật ${this.formatDateVi(asOf)}). ` +
          `Nguồn: ${INSIGHT_SOURCE}.`
        : sampleSize > 0 && avg
          ? `Khu vực ${district}: mẫu nhỏ (n=${sampleSize}), giá tham khảo ${this.formatVndPerSqm(avg)}/m² — cần thêm dữ liệu.`
          : `Chưa đủ dữ liệu verified tại ${district} để ước tính giá/m².`;

    const insight: LocalityInsight = {
      district,
      city,
      listingCount: docs.length,
      avgPricePerSqm: avg,
      minPricePerSqm: sorted[0] ?? null,
      maxPricePerSqm: sorted[sorted.length - 1] ?? null,
      medianPrice: median,
      narrative,
      source: INSIGHT_SOURCE,
      asOf,
      sampleSize,
    };

    return {
      data: insight,
      meta: { tenantId, fr: 'FR-MI-002', grounded: sampleSize > 0 },
    };
  }

  private formatVndPerSqm(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`;
    return `${v.toLocaleString('vi-VN')} đ`;
  }

  private formatDateVi(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }
}
