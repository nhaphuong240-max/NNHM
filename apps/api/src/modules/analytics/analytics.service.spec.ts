import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { AnalyticsService } from './analytics.service';
import { LeadConversionService } from '../ai-scoring/lead-conversion.service';

const leadConversionMock = {
  getHotConversionMetrics: jest.fn(async () => ({
    hotTotal: 2,
    hotContacted: 1,
    hotBooked: 0,
    hotDeposited: 0,
    hotConversionRate: 0,
    hotResponseSlaMs: null,
  })),
};

function mockRepo(count = 0, findResult: unknown[] = []) {
  return {
    count: jest.fn(async () => count),
    find: jest.fn(async () => findResult),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => count),
      getMany: jest.fn(async () => findResult),
    })),
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
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
        { provide: getRepositoryToken(ZaloLeadEventEntity), useValue: mockRepo(6) },
        { provide: getRepositoryToken(ZaloZnsDeliveryEntity), useValue: mockRepo(2) },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockRepo(0) },
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
            },
            {
              id: 'un_02',
              code: 'A-01-02',
              area: '55.00',
              basePrice: '2200000000',
              status: 'SOLD',
            },
          ]),
        },
        { provide: LeadConversionService, useValue: leadConversionMock },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('returns admin funnel dashboard (UC-AN-01)', async () => {
    const result = await service.getAdminDashboard('ten_dev_01');
    expect(result.data.attributes.funnel.leads).toBe(10);
    expect(result.data.attributes.funnel.bookings).toBe(3);
    expect(result.meta.uc).toContain('UC-AN-01');
    expect(result.meta.screen).toBe('SCR-ADMIN-001');
  });

  it('aggregates GMV from deposited bookings (UC-AN-02)', async () => {
    const bookingsRepo = mockRepo(0, [
      {
        id: 'bk_settle01',
        unitId: 'un_03',
        status: 'DEPOSITED',
        depositAmount: '100000000',
        createdAt: new Date('2026-07-28T10:00:00.000Z'),
      },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(LeadEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(BookingEntity), useValue: bookingsRepo },
        { provide: getRepositoryToken(ListingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(KycProfileEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(AuditEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(MetaLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloZnsDeliveryEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(UnitEntity), useValue: mockRepo(0) },
        { provide: LeadConversionService, useValue: leadConversionMock },
      ],
    }).compile();

    const gmvService = module.get(AnalyticsService);
    const result = await gmvService.getGmvReport('ten_dev_01');
    expect(result.data.attributes.depositGmv).toBe(100_000_000);
    expect(result.data.attributes.depositedBookings).toBe(1);
    expect(result.meta.uc).toContain('UC-AN-02');
  });

  it('returns absorption inventory breakdown (UC-AN-03)', async () => {
    const unitsRepo = {
      count: jest.fn(async ({ where }: { where: Record<string, string> }) => {
        if (where.status === 'SOLD') return 2;
        if (where.status === 'AVAILABLE') return 5;
        if (where.status === 'RESERVED') return 1;
        if (where.status === 'HOLD') return 0;
        return 8;
      }),
      find: jest.fn(async () => [
        { id: 'un_01', code: 'A-01', status: 'AVAILABLE', basePrice: '1000000000', area: '50' },
        { id: 'un_02', code: 'A-02', status: 'SOLD', basePrice: '2000000000', area: '55' },
      ]),
    };

    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(LeadEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(BookingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ListingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(KycProfileEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(AuditEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(MetaLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloZnsDeliveryEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(UnitEntity), useValue: unitsRepo },
        { provide: LeadConversionService, useValue: leadConversionMock },
      ],
    }).compile();

    const absService = module.get(AnalyticsService);
    const result = await absService.getAbsorptionReport('ten_dev_01', 'prj_sunrise');
    expect(result.data.attributes.inventory.total).toBe(8);
    expect(result.data.attributes.inventory.sold).toBe(2);
    expect(result.data.attributes.inventory.absorptionRate).toBe(0.25);
    expect(result.meta.uc).toContain('UC-AN-03');
  });

  it('aggregates campaign attribution from lead columns (UC-AN-04)', async () => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
    };
    mockQb.clone.mockReturnValue(mockQb);

    let countCalls = 0;
    mockQb.getCount.mockImplementation(async () => {
      countCalls += 1;
      return countCalls === 1 ? 10 : 6;
    });

    let rawCalls = 0;
    mockQb.getRawMany.mockImplementation(async () => {
      rawCalls += 1;
      if (rawCalls === 1) {
        return [
          { source: 'PUBLIC_UNIT_DETAIL', leads: '6' },
          { source: 'META_LEAD', leads: '4' },
        ];
      }
      if (rawCalls === 2) {
        return [{ utmCampaign: 'q7_launch', campaignId: 'camp_01', leads: '4' }];
      }
      return [
        {
          source: 'PUBLIC_UNIT_DETAIL',
          utmCampaign: 'q7_launch',
          campaignId: 'camp_01',
          leads: '4',
        },
      ];
    });

    const leadsRepo = { createQueryBuilder: jest.fn(() => mockQb) };

    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(LeadEntity), useValue: leadsRepo },
        { provide: getRepositoryToken(BookingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ListingEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(KycProfileEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(AuditEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(MetaLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloLeadEventEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(ZaloZnsDeliveryEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockRepo(0) },
        { provide: getRepositoryToken(UnitEntity), useValue: mockRepo(0) },
        { provide: LeadConversionService, useValue: leadConversionMock },
      ],
    }).compile();

    const attrService = module.get(AnalyticsService);
    const result = await attrService.getAttributionReport('ten_dev_01');
    expect(result.data.attributes.totalLeads).toBe(10);
    expect(result.data.attributes.attributedLeads).toBe(6);
    expect(result.data.attributes.attributionRate).toBe(0.6);
    expect(result.data.attributes.bySource[0].source).toBe('PUBLIC_UNIT_DETAIL');
    expect(result.data.attributes.byCampaign[0].campaignKey).toBe('camp_01');
    expect(result.meta.uc).toContain('UC-AN-04');
    expect(result.meta.screen).toBe('SCR-ADMIN-AN-004');
  });
});
