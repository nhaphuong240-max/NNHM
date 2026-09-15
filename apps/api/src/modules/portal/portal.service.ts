import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { AnalyticsService } from '../analytics/analytics.service';
import { BookingContractService } from '../booking/booking-contract.service';
import { PaymentBnplService } from '../payment/payment-bnpl.service';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CommissionPolicyEntity } from '../../database/entities/commission-policy.entity';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { MetaPageBindingEntity } from '../../database/entities/meta-page-binding.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { MobileDeviceEntity } from '../../database/entities/mobile-device.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import type {
  BuyerDealDetail,
  BuyerDealNotification,
  BuyerDealStep,
  BuyerDealSummary,
  DeveloperDashboardAttributes,
  OmnichannelChannelStats,
  OmnichannelDashboardAttributes,
} from './portal.types';
import { phonesMatch } from '../crm/phone.util';
import { BuyerDealNotifyService } from './buyer-deal-notify.service';
import {
  groupBuildingsFromPins,
  mapCenterForProject,
  unitToMapPin,
} from './public-map.util';
import { summarizeLatencyMs } from './omnichannel-latency.util';

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

@Injectable()
export class PortalService {
  constructor(
    private readonly analytics: AnalyticsService,
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
    @InjectRepository(MetaPageBindingEntity)
    private readonly metaPages: Repository<MetaPageBindingEntity>,
    @InjectRepository(ZaloLeadEventEntity)
    private readonly zaloEvents: Repository<ZaloLeadEventEntity>,
    @InjectRepository(ZaloOaBindingEntity)
    private readonly zaloOas: Repository<ZaloOaBindingEntity>,
    @InjectRepository(ZaloZnsDeliveryEntity)
    private readonly zns: Repository<ZaloZnsDeliveryEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    @InjectRepository(CommissionPolicyEntity)
    private readonly policies: Repository<CommissionPolicyEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntents: Repository<PaymentIntentEntity>,
    private readonly buyerDealNotify: BuyerDealNotifyService,
    private readonly contracts: BookingContractService,
    private readonly bnpl: PaymentBnplService,
    @InjectRepository(MobileDeviceEntity)
    private readonly mobileDevices: Repository<MobileDeviceEntity>,
  ) {}

  status() {
    return {
      module: 'portal',
      screens: ['SCR-ADMIN-001', 'SCR-ADMIN-010', 'SCR-DEV-001'],
      ucs: ['UC-AN-01', 'UC-CRM-05', 'UC-UX-03', 'UC-UX-04'],
    };
  }

  private async channelEventStats(
    repo: Repository<MetaLeadEventEntity | ZaloLeadEventEntity>,
    tenantId: string,
    since7d: Date,
    since24h: Date,
  ): Promise<OmnichannelChannelStats> {
    const [processed, failed, duplicate, processing, last7d, last24h] = await Promise.all([
      repo.count({ where: { tenantId, status: 'PROCESSED' } as never }),
      repo.count({ where: { tenantId, status: 'FAILED' } as never }),
      repo.count({ where: { tenantId, status: 'DUPLICATE' } as never }),
      repo.count({ where: { tenantId, status: 'PROCESSING' } as never }),
      repo
        .createQueryBuilder('e')
        .where('e.tenant_id = :tenantId', { tenantId })
        .andWhere('e.created_at >= :since', { since: since7d })
        .getCount(),
      repo
        .createQueryBuilder('e')
        .where('e.tenant_id = :tenantId', { tenantId })
        .andWhere('e.created_at >= :since', { since: since24h })
        .getCount(),
    ]);
    const attempts = processed + failed;
    return {
      processed,
      failed,
      duplicate,
      processing,
      last7d,
      last24h,
      successRate: pct(processed, attempts),
    };
  }

  private async channelLatencyStats(
    repo: Repository<MetaLeadEventEntity | ZaloLeadEventEntity>,
    tenantId: string,
    since7d: Date,
  ) {
    const rows = await repo
      .createQueryBuilder('e')
      .select(['e.slaMs'])
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.status = :status', { status: 'PROCESSED' })
      .andWhere('e.created_at >= :since', { since: since7d })
      .andWhere('e.sla_ms IS NOT NULL')
      .getMany();

    const values = rows
      .map((r) => r.slaMs)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return summarizeLatencyMs(values);
  }

  private async combinedLatencyStats(tenantId: string, since7d: Date) {
    const load = async (repo: Repository<MetaLeadEventEntity | ZaloLeadEventEntity>) => {
      const rows = await repo
        .createQueryBuilder('e')
        .select(['e.slaMs'])
        .where('e.tenant_id = :tenantId', { tenantId })
        .andWhere('e.status = :status', { status: 'PROCESSED' })
        .andWhere('e.created_at >= :since', { since: since7d })
        .andWhere('e.sla_ms IS NOT NULL')
        .getMany();
      return rows
        .map((r) => r.slaMs)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    };

    const values = [...(await load(this.metaEvents)), ...(await load(this.zaloEvents))];
    return summarizeLatencyMs(values);
  }

  /** UC-CRM-05 · SCR-ADMIN-010 — unified Meta + Zalo omnichannel stats */
  async getOmnichannelDashboard(tenantId: string) {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      metaStats,
      zaloStats,
      metaLatency,
      zaloLatency,
      overallLatency,
      metaPages,
      zaloOas,
      metaLeadsCrm,
      zaloLeadsCrm,
      leadTotal,
      znsSent,
      znsFailed,
      recentMeta,
      recentZalo,
      recentZns,
    ] = await Promise.all([
      this.channelEventStats(this.metaEvents, tenantId, since7d, since24h),
      this.channelEventStats(this.zaloEvents, tenantId, since7d, since24h),
      this.channelLatencyStats(this.metaEvents, tenantId, since7d),
      this.channelLatencyStats(this.zaloEvents, tenantId, since7d),
      this.combinedLatencyStats(tenantId, since7d),
      this.metaPages.find({ where: { tenantId, isActive: true } }),
      this.zaloOas.find({ where: { tenantId, isActive: true } }),
      this.leads.count({ where: { tenantId, source: 'META_LEAD' } }),
      this.leads.count({ where: { tenantId, source: 'ZALO_OA' } }),
      this.leads.count({ where: { tenantId } }),
      this.zns.count({ where: { tenantId, status: 'SENT' } }),
      this.zns.count({ where: { tenantId, status: 'FAILED' } }),
      this.metaEvents.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.zaloEvents.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.zns.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 8,
      }),
    ]);

    const totalSynced = metaStats.processed + zaloStats.processed;
    const totalFailed = metaStats.failed + zaloStats.failed;
    const totalDuplicate = metaStats.duplicate + zaloStats.duplicate;

    const recentSync = [
      ...recentMeta.map((e) => ({
        id: e.id,
        channel: 'META' as const,
        externalId: e.leadgenId,
        status: e.status,
        leadId: e.leadId,
        createdAt: e.createdAt.toISOString(),
        lastError: e.lastError,
        ingestMs: e.ingestMs,
        slaMs: e.slaMs,
      })),
      ...recentZalo.map((e) => ({
        id: e.id,
        channel: 'ZALO' as const,
        externalId: e.msgId,
        status: e.status,
        leadId: e.leadId,
        createdAt: e.createdAt.toISOString(),
        lastError: e.lastError,
        ingestMs: e.ingestMs,
        slaMs: e.slaMs,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 15);

    const attributes: OmnichannelDashboardAttributes = {
      summary: {
        totalSynced,
        totalFailed,
        totalDuplicate,
        successRate: pct(totalSynced, totalSynced + totalFailed),
        crmLeadsFromChannels: metaLeadsCrm + zaloLeadsCrm,
        last24h: metaStats.last24h + zaloStats.last24h,
        last7d: metaStats.last7d + zaloStats.last7d,
        latency: overallLatency,
        opWin07Pass: overallLatency.slaPass,
      },
      meta: {
        ...metaStats,
        latency: metaLatency,
        pagesConnected: metaPages.length,
        pages: metaPages.map((p) => ({
          id: p.id,
          pageId: p.pageId,
          pageName: p.pageName,
        })),
      },
      zalo: {
        ...zaloStats,
        latency: zaloLatency,
        oasConnected: zaloOas.length,
        znsSent,
        znsFailed,
        oas: zaloOas.map((o) => ({
          id: o.id,
          oaId: o.oaId,
          oaName: o.oaName,
          hasToken: Boolean(o.accessToken || o.refreshToken),
        })),
      },
      crmAttribution: {
        metaLeads: metaLeadsCrm,
        zaloLeads: zaloLeadsCrm,
        otherLeads: Math.max(0, leadTotal - metaLeadsCrm - zaloLeadsCrm),
      },
      recentSync,
      recentZns: recentZns.map((d) => ({
        id: d.id,
        templateId: d.templateId,
        phone: d.phone,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
    };

    return {
      data: { attributes },
      meta: {
        tenantId,
        source: 'postgres' as const,
        uc: ['UC-CRM-05', 'UC-NW-01', 'UC-NW-02'],
        screen: 'SCR-ADMIN-010',
        opWin: 'OP-WIN-07',
      },
    };
  }

  async getAdminDashboard(tenantId: string) {
    return this.analytics.getAdminDashboard(tenantId);
  }

  async getDeveloperDashboard(tenantId: string, projectId?: string) {
    const unitWhere: Record<string, string> = { tenantId };
    if (projectId) unitWhere.projectId = projectId;

    const [total, available, reserved, sold, hold, published, policyCount, previewRows] =
      await Promise.all([
        this.units.count({ where: unitWhere }),
        this.units.count({ where: { ...unitWhere, status: 'AVAILABLE' } }),
        this.units.count({ where: { ...unitWhere, status: 'RESERVED' } }),
        this.units.count({ where: { ...unitWhere, status: 'SOLD' } }),
        this.units.count({ where: { ...unitWhere, status: 'HOLD' } }),
        this.listings.count({ where: { tenantId, status: 'PUBLISHED' } }),
        this.policies.count({ where: { tenantId } }),
        this.units.find({
          where: unitWhere,
          order: { code: 'ASC' },
          take: 6,
        }),
      ]);

    const attributes: DeveloperDashboardAttributes = {
      inventory: {
        total,
        available,
        reserved,
        sold,
        hold,
        absorptionRate: pct(sold, total),
      },
      listings: { published },
      commission: { policies: policyCount },
      previewUnits: previewRows.map((u) => ({
        id: u.id,
        code: u.code,
        floor: u.floor,
        area: Number(u.area),
        basePrice: Number(u.basePrice),
        status: u.status,
        version: u.version,
      })),
    };

    return {
      data: { attributes },
      meta: {
        tenantId,
        projectId: projectId ?? null,
        source: 'postgres' as const,
        uc: ['UC-UX-04', 'UC-GR-01'],
      },
    };
  }

  private buildDealSteps(status: BookingEntity['status']): BuyerDealStep[] {
    return [
      {
        id: 'RESERVED',
        label: 'Giữ chỗ',
        done: true,
        active: status === 'RESERVED',
      },
      {
        id: 'DEPOSIT_PENDING',
        label: 'Thanh toán cọc',
        done: status === 'DEPOSITED' || status === 'REFUNDED',
        active: status === 'RESERVED',
      },
      {
        id: 'DEPOSITED',
        label: 'Hoàn tất cọc',
        done: status === 'DEPOSITED',
        active: false,
      },
    ];
  }

  private async mapBuyerDeal(row: BookingEntity, unitCode: string): Promise<BuyerDealSummary> {
    const steps = this.buildDealSteps(row.status);
    const active = steps.find((s) => s.active)?.id ?? row.status;
    return {
      id: row.id,
      status: row.status,
      unitId: row.unitId,
      unitCode,
      leadId: row.leadId ?? undefined,
      depositAmount: row.depositAmount ? Number(row.depositAmount) : undefined,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      currentStep: active,
    };
  }

  private async leadIdsForSeekerPhone(tenantId: string, seekerPhone: string): Promise<string[]> {
    const rows = await this.leads.find({
      where: { tenantId },
      select: { id: true, phone: true },
      take: 500,
    });
    return rows.filter((l) => phonesMatch(l.phone, seekerPhone)).map((l) => l.id);
  }

  private async assertBookingOwnedBySeeker(
    tenantId: string,
    booking: BookingEntity,
    seekerPhone?: string,
  ): Promise<void> {
    if (!seekerPhone?.trim()) {
      throw new ForbiddenException({ detail: 'Seeker OTP verification required' });
    }
    if (!booking.leadId) {
      throw new ForbiddenException({ detail: 'Booking is not linked to your profile' });
    }
    const lead = await this.leads.findOne({ where: { id: booking.leadId, tenantId } });
    if (!lead || !phonesMatch(lead.phone, seekerPhone)) {
      throw new ForbiddenException({ detail: 'Deal not available for this phone' });
    }
  }

  /** UC-BK-02 · SCR-BUYER-002 — buyer deal list (seeker-scoped) */
  async getBuyerDeals(tenantId: string, seekerPhone?: string) {
    if (!seekerPhone?.trim()) {
      return {
        data: [],
        meta: {
          tenantId,
          count: 0,
          uc: 'UC-BK-02',
          screen: 'SCR-BUYER-002',
          requiresSeekerAuth: true,
        },
      };
    }

    const leadIds = await this.leadIdsForSeekerPhone(tenantId, seekerPhone);
    if (leadIds.length === 0) {
      return {
        data: [],
        meta: { tenantId, count: 0, uc: 'UC-BK-02', screen: 'SCR-BUYER-002', seekerPhone },
      };
    }

    const rows = await this.bookings.find({
      where: { tenantId, leadId: In(leadIds) },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const unitIds = [...new Set(rows.map((r) => r.unitId))];
    const units =
      unitIds.length > 0
        ? await this.units.find({ where: { tenantId, id: In(unitIds) } })
        : [];
    const unitMap = new Map(units.map((u) => [u.id, u.code]));

    const data = await Promise.all(
      rows.map((row) => this.mapBuyerDeal(row, unitMap.get(row.unitId) ?? row.unitId)),
    );

    return {
      data,
      meta: { tenantId, count: data.length, uc: 'UC-BK-02', screen: 'SCR-BUYER-002', seekerPhone },
    };
  }

  async getBuyerDeal(tenantId: string, bookingId: string, seekerPhone?: string) {
    const row = await this.bookings.findOne({ where: { id: bookingId.trim(), tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `Booking ${bookingId} not found` });
    }
    await this.assertBookingOwnedBySeeker(tenantId, row, seekerPhone);

    const unit = await this.units.findOne({ where: { id: row.unitId, tenantId } });
    const intents = await this.paymentIntents.find({
      where: { bookingId: row.id, tenantId },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const intent = intents[0];

    const summary = await this.mapBuyerDeal(row, unit?.code ?? row.unitId);
    const notifications = await this.loadBuyerNotifications(tenantId, row.id);
    const detail: BuyerDealDetail = {
      ...summary,
      allowedTransitions:
        row.status === 'RESERVED'
          ? ['CANCEL', 'CREATE_PAYMENT']
          : row.status === 'DEPOSITED'
            ? ['CANCEL', 'CLOSE_DEAL']
            : [],
      steps: this.buildDealSteps(row.status),
      paymentIntentId: intent?.id,
      notes: row.notes ?? undefined,
      notifications,
    };

    return {
      data: { attributes: detail },
      meta: { tenantId, uc: ['UC-BK-02', 'UC-UX-02'], screen: 'SCR-BUYER-002' },
    };
  }

  /** UC-UX-02 — demo ZNS stub for buyer deal milestone */
  async sendBuyerDealNotificationStub(
    tenantId: string,
    bookingId: string,
    event: 'BOOKING_RESERVED' | 'PAYMENT_SUCCESS' | 'CONTRACT_SIGNED' = 'BOOKING_RESERVED',
  ) {
    const result = await this.buyerDealNotify.notifyDealUpdate({ tenantId, bookingId, event });
    return {
      data: result,
      meta: { uc: ['UC-UX-02'], screen: 'SCR-BUYER-002', mode: 'notify-stub' },
    };
  }

  private async loadBuyerNotifications(
    tenantId: string,
    bookingId: string,
  ): Promise<BuyerDealNotification[]> {
    const events = await this.audit
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere(
        `(e.entity_type = 'booking' AND e.entity_id = :bookingId)
         OR (e.entity_type = 'payment_intent' AND e.payload->>'bookingId' = :bookingId)
         OR (e.entity_type = 'contract' AND e.payload->>'bookingId' = :bookingId)
         OR (e.entity_type = 'payment_webhook' AND e.payload->>'bookingId' = :bookingId)`,
        { bookingId },
      )
      .orderBy('e.created_at', 'DESC')
      .take(25)
      .getMany();

    const notifications: BuyerDealNotification[] = [];

    for (const event of events) {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      if (event.action === 'BUYER_DEAL_ZNS_SENT') {
        notifications.push({
          id: event.id,
          channel: 'ZNS',
          title: String(payload.eventLabel ?? 'Cập nhật giao dịch'),
          body: `ZNS gửi tới buyer · ${String(payload.event ?? 'deal_update')}`,
          sentAt: event.createdAt.toISOString(),
          status: 'SENT',
        });
        continue;
      }
      if (event.action === 'PAYMENT_ZNS_SENT') {
        notifications.push({
          id: event.id,
          channel: 'ZNS',
          title: 'Xác nhận thanh toán cọc',
          body: `ZNS booking ${String(payload.bookingId ?? bookingId)}`,
          sentAt: event.createdAt.toISOString(),
          status: 'SENT',
        });
        continue;
      }
      if (event.action === 'PAYMENT_SMS_OTP_SENT' || event.action === 'PAYMENT_SMS_SENT') {
        notifications.push({
          id: event.id,
          channel: 'SMS',
          title: event.action === 'PAYMENT_SMS_OTP_SENT' ? 'OTP thanh toán' : 'SMS xác nhận cọc',
          body: `SMS payment intent ${String(payload.paymentIntentId ?? payload.bookingId ?? bookingId)}`,
          sentAt: event.createdAt.toISOString(),
          status: 'SENT',
        });
        continue;
      }
      if (event.entityType === 'contract' && event.action === 'SIGNED') {
        notifications.push({
          id: event.id,
          channel: 'IN_APP',
          title: 'Hợp đồng đã ký điện tử',
          body: `Document vault: ${String(payload.documentId ?? payload.documentVaultRef ?? '—')}`,
          sentAt: event.createdAt.toISOString(),
          status: 'SENT',
        });
      }
    }

    if (notifications.length === 0) {
      notifications.push({
        id: `stub_${bookingId}`,
        channel: 'IN_APP',
        title: 'Theo dõi giao dịch',
        body: 'Chưa có thông báo SMS/ZNS — dùng nút gửi ZNS demo trên deal detail.',
        sentAt: new Date().toISOString(),
        status: 'SKIPPED',
      });
    }

    return notifications;
  }

  /** UC-UX-06 · SCR-PUBLIC-003 — immersive map / 3D discovery pilot */
  async getPublicMap(tenantId: string, projectId?: string) {
    const where = projectId ? { tenantId, projectId } : { tenantId };
    const units = await this.units.find({ where, take: 40, order: { code: 'ASC' } });
    const pins = units.map((u, idx) =>
      unitToMapPin(
        {
          id: u.id,
          code: u.code,
          basePrice: Number(u.basePrice),
          status: u.status,
          bedrooms: u.bedrooms,
          area: Number(u.area),
          floor: u.floor,
          buildingId: u.projectId,
          projectId: u.projectId,
        },
        idx,
      ),
    );
    const center = mapCenterForProject(projectId ?? units[0]?.projectId);
    const buildings = groupBuildingsFromPins(pins);

    return {
      data: {
        projectId: projectId ?? null,
        center: { lat: center.lat, lng: center.lng, label: center.label },
        pins,
        buildings,
        mode: '3d-map-production',
      },
      meta: {
        tenantId,
        count: pins.length,
        uc: ['UC-UX-06'],
        screen: 'SCR-PUBLIC-003',
      },
    };
  }

  /** UC-UX-02 — buyer push token registration (Expo) */
  async registerBuyerDevice(
    tenantId: string,
    input: { pushToken?: string; platform?: string },
  ) {
    const pushToken = input.pushToken?.trim();
    if (!pushToken) {
      throw new UnprocessableEntityException({ detail: 'pushToken is required' });
    }
    const existing = await this.mobileDevices.findOne({ where: { tenantId, pushToken } });
    if (existing) {
      return {
        data: { id: existing.id, appChannel: existing.appChannel, replay: true },
        meta: { uc: ['UC-UX-02'], screen: 'SCR-BUYER-MOBILE' },
      };
    }
    const saved = await this.mobileDevices.save({
      id: `md_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      tenantId,
      userId: 'buyer_anonymous',
      pushToken,
      platform: input.platform ?? 'expo',
      appChannel: 'BUYER',
    });
    return {
      data: { id: saved.id, appChannel: saved.appChannel, replay: false },
      meta: { uc: ['UC-UX-02'], screen: 'SCR-BUYER-MOBILE' },
    };
  }

  /** UC-PAY-07 — buyer BNPL apply via portal (public + tenant header) */
  async applyBuyerBnpl(tenantId: string, bookingId: string, planId: string) {
    return this.bnpl.apply(tenantId, { bookingId, planId }, undefined);
  }

  /** UC-BK-07 — buyer e-sign session for in-app WebView */
  async getBuyerSignSession(tenantId: string, bookingId: string) {
    const drafts = await this.contracts.listDrafts(tenantId, bookingId.trim());
    const contract = drafts.data?.[0];
    if (!contract?.id) {
      throw new NotFoundException({ detail: `No contract draft for booking ${bookingId}` });
    }
    const session = await this.contracts.getSignSession(tenantId, contract.id);
    const attrs = session.data as {
      contractId: string;
      signingUrl?: string;
      otpHint?: string;
    };
    return {
      data: {
        contractId: attrs.contractId,
        signingUrl: attrs.signingUrl ?? `${process.env.WEB_BASE_URL ?? 'http://localhost:5174'}/buyer/contracts/${bookingId}`,
        otpHint: attrs.otpHint,
      },
      meta: { uc: ['UC-BK-07', 'UC-UX-02'], screen: 'SCR-BUYER-MOBILE' },
    };
  }
}
