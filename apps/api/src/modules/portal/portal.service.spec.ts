import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CommissionPolicyEntity } from '../../database/entities/commission-policy.entity';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { MetaLeadEventEntity } from '../../database/entities/meta-lead-event.entity';
import { MetaPageBindingEntity } from '../../database/entities/meta-page-binding.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ZaloLeadEventEntity } from '../../database/entities/zalo-lead-event.entity';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { ZaloZnsDeliveryEntity } from '../../database/entities/zalo-zns-delivery.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { PortalService } from './portal.service';
import { BuyerDealNotifyService } from './buyer-deal-notify.service';
import { AnalyticsService } from '../analytics/analytics.service';

const buyerDealNotifyMock = {
  notifyDealUpdate: jest.fn().mockResolvedValue({ sent: true, channel: 'ZNS', deliveryId: 'zns_demo' }),
};

function mockRepo(count = 0, findResult: unknown[] = []) {
  return {
    count: jest.fn(async () => count),
    find: jest.fn(async () => findResult),
    findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
      findResult.find((row) => {
        const r = row as Record<string, string>;
        return Object.entries(where).every(([k, v]) => r[k] === v);
      }) ?? null,
    ),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => count),
      getMany: jest.fn(async () => []),
    })),
  };
}

describe('PortalService', () => {
  let service: PortalService;
  const analyticsMock = {
    getAdminDashboard: jest.fn(async (tenantId: string) => ({
      data: {
        attributes: {
          funnel: { leads: 10, bookings: 3, deposited: 1, conversionRate: 0.1 },
          leadsByStatus: {},
          moderation: { pendingReview: 2, published: 0, draft: 0, rejected: 0 },
          pendingListings: [{ id: 'ls_01', unitId: 'un_01', unitCode: 'A-01-01', title: 'Test', antiDriftStatus: 'PASS', createdAt: '2026-07-28T10:00:00.000Z' }],
          integrations: { metaProcessed: 4, metaFailed: 0, zaloProcessed: 6, zaloFailed: 0, znsSent: 2 },
          ops: { kycPending: 1, auditEvents7d: 5 },
        },
      },
      meta: { tenantId, uc: ['UC-AN-01', 'UC-UX-03'], screen: 'SCR-ADMIN-001' },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: getRepositoryToken(LeadEntity), useValue: mockRepo(10) },
        { provide: getRepositoryToken(BookingEntity), useValue: mockRepo(3) },
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: mockRepo(2, [
            {
              id: 'ls_01',
              unitId: 'un_01',
              title: 'Test listing',
              antiDriftStatus: 'PASS',
              createdAt: new Date('2026-07-28T10:00:00.000Z'),
              unit: { code: 'A-01-01' },
            },
          ]),
        },
        { provide: getRepositoryToken(KycProfileEntity), useValue: mockRepo(1) },
        { provide: getRepositoryToken(AuditEventEntity), useValue: mockRepo(5) },
        { provide: getRepositoryToken(MetaLeadEventEntity), useValue: mockRepo(4) },
        { provide: getRepositoryToken(MetaPageBindingEntity), useValue: mockRepo(1) },
        { provide: getRepositoryToken(ZaloLeadEventEntity), useValue: mockRepo(6) },
        { provide: getRepositoryToken(ZaloOaBindingEntity), useValue: mockRepo(1) },
        { provide: getRepositoryToken(ZaloZnsDeliveryEntity), useValue: mockRepo(2) },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: mockRepo(8, [
            {
              id: 'un_01',
              code: 'A-01-01',
              floor: 1,
              area: '50.00',
              basePrice: '2000000000',
              status: 'AVAILABLE',
              version: 3,
            },
          ]),
        },
        { provide: getRepositoryToken(CommissionPolicyEntity), useValue: mockRepo(1) },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockRepo(0) },
        { provide: BuyerDealNotifyService, useValue: buyerDealNotifyMock },
      ],
    }).compile();

    service = module.get(PortalService);
  });

  it('returns admin dashboard funnel and moderation stats', async () => {
    const result = await service.getAdminDashboard('ten_dev_01');
    expect(result.data.attributes.funnel.leads).toBe(10);
    expect(result.data.attributes.funnel.bookings).toBe(3);
    expect(result.data.attributes.moderation.pendingReview).toBe(2);
    expect(result.data.attributes.pendingListings).toHaveLength(1);
    expect(result.meta.uc).toContain('UC-AN-01');
  });

  it('returns developer dashboard inventory and preview', async () => {
    const result = await service.getDeveloperDashboard('ten_dev_01', 'prj_sunrise');
    expect(result.data.attributes.inventory.total).toBe(8);
    expect(result.data.attributes.previewUnits[0].code).toBe('A-01-01');
    expect(result.meta.projectId).toBe('prj_sunrise');
  });

  it('returns buyer deal list with step summary', async () => {
    const bookingsRepo = mockRepo(0, [
      {
        id: 'bk_settle01',
        tenantId: 'ten_dev_01',
        unitId: 'un_03',
        leadId: 'ld_04',
        status: 'DEPOSITED',
        depositAmount: '50000000',
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
        createdAt: new Date('2026-07-28T10:00:00.000Z'),
      },
    ]);
    const unitsRepo = mockRepo(0, [{ id: 'un_03', tenantId: 'ten_dev_01', code: 'C-12-05' }]);

    const module = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: getRepositoryToken(LeadEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(BookingEntity), useValue: bookingsRepo },
        { provide: getRepositoryToken(ListingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(KycProfileEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(AuditEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(MetaLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(MetaPageBindingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloOaBindingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloZnsDeliveryEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(UnitEntity), useValue: unitsRepo },
        { provide: getRepositoryToken(CommissionPolicyEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockRepo(0) },
        { provide: BuyerDealNotifyService, useValue: buyerDealNotifyMock },
      ],
    }).compile();

    const buyerService = module.get(PortalService);
    const result = await buyerService.getBuyerDeals('ten_dev_01');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].unitCode).toBe('C-12-05');
    expect(result.data[0].currentStep).toBe('DEPOSITED');
    expect(result.meta.uc).toBe('UC-BK-02');
  });

  it('returns unified omnichannel stats for Meta and Zalo', async () => {
    const metaRepo = {
      count: jest.fn(async ({ where }: { where: Record<string, string> }) => {
        if (where.status === 'PROCESSED') return 3;
        if (where.status === 'FAILED') return 1;
        if (where.status === 'DUPLICATE') return 0;
        if (where.status === 'PROCESSING') return 0;
        return 0;
      }),
      find: jest.fn(async () => [
        {
          id: 'mle_01',
          leadgenId: 'lg_01',
          status: 'PROCESSED',
          leadId: 'ld_04',
          lastError: null,
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
        },
      ]),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => 2),
        getMany: jest.fn(async () => [{ slaMs: 800 }, { slaMs: 1200 }]),
      })),
    };
    const zaloRepo = {
      count: jest.fn(async ({ where }: { where: Record<string, string> }) => {
        if (where.status === 'PROCESSED') return 2;
        if (where.status === 'FAILED') return 0;
        if (where.status === 'DUPLICATE') return 1;
        if (where.status === 'PROCESSING') return 0;
        return 0;
      }),
      find: jest.fn(async () => [
        {
          id: 'zle_01',
          msgId: 'msg_01',
          status: 'PROCESSED',
          leadId: 'ld_02',
          lastError: null,
          createdAt: new Date('2026-07-28T11:00:00.000Z'),
        },
      ]),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => 1),
        getMany: jest.fn(async () => [{ slaMs: 700 }]),
      })),
    };
    const leadsRepo = {
      count: jest.fn(async ({ where }: { where: Record<string, string> }) => {
        if (where.source === 'META_LEAD') return 1;
        if (where.source === 'ZALO_OA') return 1;
        return 4;
      }),
    };
    const metaPagesRepo = {
      find: jest.fn(async () => [{ id: 'mpb_01', pageId: 'page_sunrise_dev', pageName: 'Sunrise Dev' }]),
    };
    const zaloOasRepo = {
      find: jest.fn(async () => [
        {
          id: 'zob_01',
          oaId: 'oa_sunrise_dev',
          oaName: 'Sunrise OA',
          accessToken: null,
          refreshToken: 'rt',
        },
      ]),
    };
    const znsRepo = {
      count: jest.fn(async ({ where }: { where: Record<string, string> }) =>
        where.status === 'SENT' ? 5 : 0,
      ),
      find: jest.fn(async () => []),
    };

    const module = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: getRepositoryToken(LeadEntity), useValue: leadsRepo },
        { provide: getRepositoryToken(BookingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ListingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(KycProfileEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(AuditEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(MetaLeadEventEntity), useValue: metaRepo },
        { provide: getRepositoryToken(MetaPageBindingEntity), useValue: metaPagesRepo },
        { provide: getRepositoryToken(ZaloLeadEventEntity), useValue: zaloRepo },
        { provide: getRepositoryToken(ZaloOaBindingEntity), useValue: zaloOasRepo },
        { provide: getRepositoryToken(ZaloZnsDeliveryEntity), useValue: znsRepo },
        { provide: getRepositoryToken(UnitEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(CommissionPolicyEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockRepo(0) },
        { provide: BuyerDealNotifyService, useValue: buyerDealNotifyMock },
      ],
    }).compile();

    const omni = module.get(PortalService);
    const result = await omni.getOmnichannelDashboard('ten_dev_01');
    expect(result.data.attributes.summary.totalSynced).toBe(5);
    expect(result.data.attributes.meta.pagesConnected).toBe(1);
    expect(result.data.attributes.zalo.znsSent).toBe(5);
    expect(result.data.attributes.crmAttribution.metaLeads).toBe(1);
    expect(result.data.attributes.recentSync[0].channel).toBe('META');
    expect(result.data.attributes.summary.opWin07Pass).toBe(true);
    expect(result.data.attributes.summary.latency.sampleCount).toBeGreaterThan(0);
    expect(result.meta.screen).toBe('SCR-ADMIN-010');
  });
});
