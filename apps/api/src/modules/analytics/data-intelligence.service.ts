import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { DataMartDailyEntity } from '../../database/entities/data-mart-daily.entity';
import { DataProductEntitlementEntity } from '../../database/entities/data-product-entitlement.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { buildAbsorptionForecast } from './analytics-forecast.util';

@Injectable()
export class DataIntelligenceService {
  constructor(
    @InjectRepository(DataMartDailyEntity)
    private readonly mart: Repository<DataMartDailyEntity>,
    @InjectRepository(DataProductEntitlementEntity)
    private readonly entitlements: Repository<DataProductEntitlementEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  async ensureEntitlements(tenantId: string) {
    const codes: Array<DataProductEntitlementEntity['productCode']> = [
      'HEATMAP',
      'PRICING_REPORT',
      'MARKET_BRIEF',
    ];
    for (const productCode of codes) {
      const existing = await this.entitlements.findOne({ where: { tenantId, productCode } });
      if (existing) continue;
      await this.entitlements.save({
        id: `dpe_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        tenantId,
        productCode,
        enabled: true,
        quotaPerMonth: 100,
      });
    }
  }

  async buildDailyMart(tenantId: string, projectId?: string) {
    const reportDate = new Date().toISOString().slice(0, 10);
    const qb = this.units.createQueryBuilder('u').where('u.tenant_id = :tenantId', { tenantId });
    if (projectId) qb.andWhere('u.project_id = :projectId', { projectId });
    const unitRows = await qb.getMany();

    const total = unitRows.length;
    const sold = unitRows.filter((u) => u.status === 'SOLD').length;
    const absorptionRate = total > 0 ? sold / total : 0;
    const prices = unitRows.map((u) => Number(u.basePrice)).filter((n) => n > 0);
    const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const avgPriceBand =
      avg >= 5_000_000_000 ? 'premium' : avg >= 2_000_000_000 ? 'mid' : 'affordable';

    const since30 = new Date(Date.now() - 30 * 86400000);
    const velocityUnits = await this.bookings
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.created_at >= :since', { since: since30 })
      .getCount();

    const heatmap = {
      districts: unitRows.slice(0, 5).map((u) => ({
        unitId: u.id,
        code: u.code,
        status: u.status,
        basePrice: Number(u.basePrice),
        intensity: u.status === 'SOLD' ? 1 : u.status === 'RESERVED' ? 0.7 : 0.3,
      })),
    };

    const id = `dm_${tenantId}_${reportDate.replace(/-/g, '')}_${projectId ?? 'all'}`;
    return this.mart.save({
      id,
      tenantId,
      projectId: projectId ?? null,
      reportDate,
      absorptionRate: String(Math.round(absorptionRate * 10000) / 10000),
      avgPriceBand,
      velocityUnits,
      heatmap,
    });
  }

  async getHeatmap(tenantId: string, projectId?: string) {
    await this.ensureEntitlements(tenantId);
    const row = await this.buildDailyMart(tenantId, projectId);
    return {
      data: row.heatmap,
      meta: { tenantId, projectId: projectId ?? null, uc: ['T5-S5'], screen: 'SCR-DEV-005' },
    };
  }

  async getPricingReport(tenantId: string, projectId: string) {
    await this.ensureEntitlements(tenantId);
    const mart = await this.buildDailyMart(tenantId, projectId);
    const units = await this.units.find({ where: { tenantId, projectId } });
    const forecast = buildAbsorptionForecast({
      total: units.length,
      available: units.filter((u) => u.status === 'AVAILABLE').length,
      sold: units.filter((u) => u.status === 'SOLD').length,
      months: 6,
    });

    const csv = [
      'unitId,code,status,basePrice,marketBand',
      ...units.map(
        (u) =>
          `${u.id},${u.code},${u.status},${u.basePrice},${mart.avgPriceBand ?? 'mid'}`,
      ),
    ].join('\n');

    return {
      data: {
        projectId,
        avgPriceBand: mart.avgPriceBand,
        absorptionRate: Number(mart.absorptionRate),
        forecast,
        csv,
      },
      meta: { tenantId, uc: ['T5-S5'], product: 'PRICING_REPORT' },
    };
  }

  async getMarketBrief(tenantId: string) {
    await this.ensureEntitlements(tenantId);
    const mart = await this.buildDailyMart(tenantId);
    return {
      data: {
        summary: `Absorption ${(Number(mart.absorptionRate) * 100).toFixed(1)}% · velocity ${mart.velocityUnits} bookings/30d`,
        avgPriceBand: mart.avgPriceBand,
        subscription: 'MARKET_BRIEF',
      },
      meta: { tenantId, uc: ['T5-S5'], product: 'MARKET_BRIEF' },
    };
  }

  /** T6 — data product billing / entitlements summary */
  async getBillingSummary(tenantId: string) {
    await this.ensureEntitlements(tenantId);
    const rows = await this.entitlements.find({ where: { tenantId } });
    const lineItems = rows.map((r) => ({
      productCode: r.productCode,
      enabled: r.enabled,
      quotaPerMonth: r.quotaPerMonth,
      unitPriceVnd: r.productCode === 'MARKET_BRIEF' ? 5_000_000 : 2_000_000,
    }));
    const mrr = lineItems.filter((l) => l.enabled).reduce((s, l) => s + l.unitPriceVnd, 0);
    return {
      data: {
        tenantId,
        currency: 'VND',
        lineItems,
        estimatedMrrVnd: mrr,
        billingTier: mrr >= 10_000_000 ? 'ENTERPRISE_DATA' : 'STANDARD_DATA',
      },
      meta: { uc: ['T6-S2'], product: 'DATA_BILLING' },
    };
  }
}
