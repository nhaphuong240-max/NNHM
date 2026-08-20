import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import type {
  AbsorptionReportAttributes,
  AdminDashboardAttributes,
  AttributionReportAttributes,
  ForecastReportAttributes,
  GmvReportAttributes,
} from './analytics.types';
import { parseDateRange, pct } from './analytics.util';
import { buildAbsorptionForecast, buildMlAbsorptionForecast } from './analytics-forecast.util';
import { LeadConversionService } from '../ai-scoring/lead-conversion.service';

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'VIEWING', 'NEGOTIATING', 'BOOKING', 'WON', 'LOST'] as const;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leads: Repository<LeadEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(KycProfileEntity)
    private readonly kyc: Repository<KycProfileEntity>,
    @InjectRepository(AuditEventEntity)
    private readonly audit: Repository<AuditEventEntity>,
    @InjectRepository(MetaLeadEventEntity)
    private readonly metaEvents: Repository<MetaLeadEventEntity>,
    @InjectRepository(ZaloLeadEventEntity)
    private readonly zaloEvents: Repository<ZaloLeadEventEntity>,
    @InjectRepository(ZaloZnsDeliveryEntity)
    private readonly zns: Repository<ZaloZnsDeliveryEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntents: Repository<PaymentIntentEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly leadConversion: LeadConversionService,
  ) {}

  status() {
    return {
      module: 'analytics',
      screens: ['SCR-ADMIN-001', 'SCR-ADMIN-003'],
      ucs: ['UC-AN-01', 'UC-AN-02', 'UC-AN-03', 'UC-AN-04', 'UC-AN-05'],
    };
  }

  /** UC-AN-01 · SCR-ADMIN-001 — admin funnel & KPI read-model */
  async getAdminDashboard(tenantId: string) {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      leadTotal,
      bookingTotal,
      deposited,
      pendingReview,
      published,
      draft,
      rejected,
      kycPending,
      auditEvents7d,
      metaProcessed,
      metaFailed,
      zaloProcessed,
      zaloFailed,
      znsSent,
      pendingRows,
      ...leadStatusCounts
    ] = await Promise.all([
      this.leads.count({ where: { tenantId } }),
      this.bookings.count({ where: { tenantId } }),
      this.bookings.count({ where: { tenantId, status: 'DEPOSITED' } }),
      this.listings.count({ where: { tenantId, status: 'PENDING_REVIEW' } }),
      this.listings.count({ where: { tenantId, status: 'PUBLISHED' } }),
      this.listings.count({ where: { tenantId, status: 'DRAFT' } }),
      this.listings.count({ where: { tenantId, status: 'REJECTED' } }),
      this.kyc.count({ where: { tenantId, status: 'PENDING' } }),
      this.audit
        .createQueryBuilder('e')
        .where('e.tenant_id = :tenantId', { tenantId })
        .andWhere('e.created_at >= :since', { since: since7d })
        .getCount(),
      this.metaEvents.count({ where: { tenantId, status: 'PROCESSED' } }),
      this.metaEvents.count({ where: { tenantId, status: 'FAILED' } }),
      this.zaloEvents.count({ where: { tenantId, status: 'PROCESSED' } }),
      this.zaloEvents.count({ where: { tenantId, status: 'FAILED' } }),
      this.zns.count({ where: { tenantId, status: 'SENT' } }),
      this.listings.find({
        where: { tenantId, status: 'PENDING_REVIEW' },
        relations: { unit: true },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      ...LEAD_STATUSES.map((status) =>
        this.leads.count({ where: { tenantId, status } }),
      ),
    ]);

    const leadsByStatus = Object.fromEntries(
      LEAD_STATUSES.map((status, i) => [status, leadStatusCounts[i] as number]),
    );

    const hotConversion = await this.leadConversion.getHotConversionMetrics(tenantId);

    const attributes: AdminDashboardAttributes = {
      funnel: {
        leads: leadTotal,
        bookings: bookingTotal,
        deposited,
        conversionRate: pct(deposited, leadTotal),
      },
      leadsByStatus,
      moderation: { pendingReview, published, draft, rejected },
      pendingListings: pendingRows.map((row) => ({
        id: row.id,
        unitId: row.unitId,
        unitCode: row.unit?.code ?? row.unitId,
        title: row.title,
        antiDriftStatus: row.antiDriftStatus,
        createdAt: row.createdAt.toISOString(),
      })),
      integrations: {
        metaProcessed,
        metaFailed,
        zaloProcessed,
        zaloFailed,
        znsSent,
      },
      ops: { kycPending, auditEvents7d },
      hotConversion,
    };

    return {
      data: { attributes },
      meta: {
        tenantId,
        source: 'postgres' as const,
        uc: ['UC-AN-01', 'UC-UX-03'],
        screen: 'SCR-ADMIN-001',
      },
    };
  }

  /** UC-AN-02 · SCR-ADMIN-003 — GMV from deposits + succeeded payments (BR-11 pilot) */
  async getGmvReport(tenantId: string, from?: string, to?: string) {
    const { from: fromDate, to: toDate } = parseDateRange(from, to);

    const [depositedRows, paymentRows] = await Promise.all([
      this.bookings
        .createQueryBuilder('b')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.status = :status', { status: 'DEPOSITED' })
        .andWhere('b.created_at >= :from', { from: fromDate })
        .andWhere('b.created_at <= :to', { to: toDate })
        .orderBy('b.created_at', 'DESC')
        .getMany(),
      this.paymentIntents
        .createQueryBuilder('p')
        .where('p.tenant_id = :tenantId', { tenantId })
        .andWhere('p.status = :status', { status: 'SUCCEEDED' })
        .andWhere('p.created_at >= :from', { from: fromDate })
        .andWhere('p.created_at <= :to', { to: toDate })
        .orderBy('p.created_at', 'DESC')
        .getMany(),
    ]);

    const depositGmv = depositedRows.reduce(
      (sum, row) => sum + Number(row.depositAmount ?? 0),
      0,
    );
    const paymentGmv = paymentRows.reduce((sum, row) => sum + Number(row.amount), 0);

    const monthMap = new Map<string, { depositGmv: number; paymentGmv: number }>();
    for (const row of depositedRows) {
      const month = row.createdAt.toISOString().slice(0, 7);
      const entry = monthMap.get(month) ?? { depositGmv: 0, paymentGmv: 0 };
      entry.depositGmv += Number(row.depositAmount ?? 0);
      monthMap.set(month, entry);
    }
    for (const row of paymentRows) {
      const month = row.createdAt.toISOString().slice(0, 7);
      const entry = monthMap.get(month) ?? { depositGmv: 0, paymentGmv: 0 };
      entry.paymentGmv += Number(row.amount);
      monthMap.set(month, entry);
    }

    const byMonth = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values }));

    const attributes: GmvReportAttributes = {
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      depositGmv,
      paymentGmv,
      totalGmv: Math.max(depositGmv, paymentGmv),
      depositedBookings: depositedRows.length,
      succeededPayments: paymentRows.length,
      byMonth,
      recentDeposits: depositedRows.slice(0, 8).map((row) => ({
        bookingId: row.id,
        unitId: row.unitId,
        amount: Number(row.depositAmount ?? 0),
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    };

    return {
      data: { attributes },
      meta: {
        tenantId,
        source: 'postgres' as const,
        uc: ['UC-AN-02'],
        screen: 'SCR-ADMIN-003',
      },
    };
  }

  /** UC-AN-03 — absorption & inventory read-model */
  async getAbsorptionReport(tenantId: string, projectId?: string) {
    const unitWhere: Record<string, string> = { tenantId };
    if (projectId?.trim()) unitWhere.projectId = projectId.trim();

    const statuses = ['AVAILABLE', 'RESERVED', 'SOLD', 'HOLD'] as const;
    const [total, available, reserved, sold, hold, previewRows] = await Promise.all([
      this.units.count({ where: unitWhere }),
      this.units.count({ where: { ...unitWhere, status: 'AVAILABLE' } }),
      this.units.count({ where: { ...unitWhere, status: 'RESERVED' } }),
      this.units.count({ where: { ...unitWhere, status: 'SOLD' } }),
      this.units.count({ where: { ...unitWhere, status: 'HOLD' } }),
      this.units.find({
        where: unitWhere,
        order: { code: 'ASC' },
        take: 12,
      }),
    ]);

    const allUnits = await this.units.find({
      where: unitWhere,
      select: { status: true, basePrice: true },
    });
    let availableBasePrice = 0;
    let soldBasePrice = 0;
    for (const u of allUnits) {
      const price = Number(u.basePrice);
      if (u.status === 'AVAILABLE') availableBasePrice += price;
      if (u.status === 'SOLD') soldBasePrice += price;
    }

    const statusBreakdown = Object.fromEntries(statuses.map((status, i) => [status, [available, reserved, sold, hold][i]]));

    const attributes: AbsorptionReportAttributes = {
      projectId: projectId?.trim() ?? null,
      inventory: {
        total,
        available,
        reserved,
        sold,
        hold,
        absorptionRate: pct(sold, total),
      },
      statusBreakdown,
      inventoryValue: { availableBasePrice, soldBasePrice },
      previewUnits: previewRows.map((u) => ({
        id: u.id,
        code: u.code,
        status: u.status,
        basePrice: Number(u.basePrice),
        area: Number(u.area),
      })),
    };

    return {
      data: { attributes },
      meta: {
        tenantId,
        projectId: projectId?.trim() ?? null,
        source: 'postgres' as const,
        uc: ['UC-AN-03'],
        screen: 'SCR-DEV-AN-003',
      },
    };
  }

  /** UC-AN-05 stub · SCR-DEV-005 — linear absorption forecast (Phase 3 preview) */
  async getAbsorptionForecast(tenantId: string, projectId?: string, monthsRaw?: string) {
    const base = await this.getAbsorptionReport(tenantId, projectId);
    const inv = base.data.attributes.inventory;
    const months = Math.min(Math.max(Number.parseInt(monthsRaw ?? '6', 10) || 6, 1), 12);
    const { monthlySoldRate, projections } = buildAbsorptionForecast({
      total: inv.total,
      sold: inv.sold,
      available: inv.available,
      months,
    });

    const attributes: ForecastReportAttributes = {
      projectId: projectId?.trim() ?? null,
      horizonMonths: months,
      current: inv,
      monthlySoldRate,
      projections,
      disclaimer:
        'Stub forecast — linear projection from current absorption mix. Production UC-AN-05 uses ML + seasonality.',
    };

    return {
      data: { attributes },
      meta: {
        tenantId,
        projectId: projectId?.trim() ?? null,
        source: 'postgres' as const,
        uc: ['UC-AN-05'],
        screen: 'SCR-DEV-005',
        model: 'absorption_rules_v1',
      },
    };
  }

  /** T6 — ML-ready forecast with velocity feature */
  async getMlAbsorptionForecast(tenantId: string, projectId?: string, monthsRaw?: string) {
    const base = await this.getAbsorptionReport(tenantId, projectId);
    const inv = base.data.attributes.inventory;
    const months = Math.min(Math.max(Number.parseInt(monthsRaw ?? '6', 10) || 6, 1), 12);
    const since30 = new Date(Date.now() - 30 * 86400000);
    const velocity30d = await this.bookings
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.created_at >= :since', { since: since30 })
      .getCount();

    const ml = buildMlAbsorptionForecast({
      total: inv.total,
      sold: inv.sold,
      available: inv.available,
      months,
      velocity30d,
    });

    return {
      data: {
        attributes: {
          projectId: projectId?.trim() ?? null,
          horizonMonths: months,
          current: inv,
          monthlySoldRate: ml.monthlySoldRate,
          confidenceBand: ml.confidenceBand,
          projections: ml.projections,
          model: ml.model,
          features: ml.features,
        },
      },
      meta: {
        tenantId,
        projectId: projectId?.trim() ?? null,
        uc: ['T6-S3', 'UC-AN-05'],
        screen: 'SCR-DEV-005',
        model: ml.model,
      },
    };
  }

  /** UC-AN-04 — campaign / UTM attribution read-model (indexed lead columns) */
  async getAttributionReport(tenantId: string, from?: string, to?: string) {
    const { from: fromDate, to: toDate } = parseDateRange(from, to);

    const qb = this.leads
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.created_at >= :from', { from: fromDate })
      .andWhere('l.created_at <= :to', { to: toDate });

    const totalLeads = await qb.clone().getCount();

    const attributedLeads = await qb
      .clone()
      .andWhere('(l.utm_campaign IS NOT NULL OR l.campaign_id IS NOT NULL)')
      .getCount();

    const bySourceRaw = await qb
      .clone()
      .select('l.source', 'source')
      .addSelect('COUNT(*)', 'leads')
      .groupBy('l.source')
      .orderBy('leads', 'DESC')
      .getRawMany<{ source: string; leads: string }>();

    const byCampaignRaw = await qb
      .clone()
      .select('l.utm_campaign', 'utmCampaign')
      .addSelect('l.campaign_id', 'campaignId')
      .addSelect('COUNT(*)', 'leads')
      .groupBy('l.campaign_id')
      .addGroupBy('l.utm_campaign')
      .orderBy('leads', 'DESC')
      .getRawMany<{ utmCampaign: string | null; campaignId: string | null; leads: string }>();

    const bySourceCampaignRaw = await qb
      .clone()
      .select('l.source', 'source')
      .addSelect('l.utm_campaign', 'utmCampaign')
      .addSelect('l.campaign_id', 'campaignId')
      .addSelect('COUNT(*)', 'leads')
      .groupBy('l.source')
      .addGroupBy('l.utm_campaign')
      .addGroupBy('l.campaign_id')
      .orderBy('leads', 'DESC')
      .take(25)
      .getRawMany<{ source: string; utmCampaign: string | null; campaignId: string | null; leads: string }>();

    const bySource = bySourceRaw.map((row) => ({
      source: row.source,
      leads: Number(row.leads),
      share: pct(Number(row.leads), totalLeads),
    }));

    const byCampaign = byCampaignRaw.map((row) => ({
      campaignKey: row.campaignId ?? row.utmCampaign ?? '(unattributed)',
      utmCampaign: row.utmCampaign,
      campaignId: row.campaignId,
      leads: Number(row.leads),
      share: pct(Number(row.leads), totalLeads),
    }));

    const attributes: AttributionReportAttributes = {
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      totalLeads,
      attributedLeads,
      attributionRate: pct(attributedLeads, totalLeads),
      bySource,
      byCampaign,
      bySourceCampaign: bySourceCampaignRaw.map((row) => ({
        source: row.source,
        utmCampaign: row.utmCampaign,
        campaignId: row.campaignId,
        leads: Number(row.leads),
      })),
    };

    return {
      data: { attributes },
      meta: {
        tenantId,
        source: 'postgres' as const,
        uc: ['UC-AN-04'],
        screen: 'SCR-ADMIN-AN-004',
      },
    };
  }
}
