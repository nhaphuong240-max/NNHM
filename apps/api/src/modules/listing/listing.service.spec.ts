import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { SearchIndexService } from '../search/search-index.service';
import { AntiDriftService } from './anti-drift.service';
import { ListingService } from './listing.service';

describe('ListingService', () => {
  let service: ListingService;

  const unit: UnitEntity = {
    id: 'un_03',
    tenantId: 'ten_dev_01',
    projectId: 'prj_sunrise',
    code: 'B-08-02',
    floor: 8,
    area: '72.00',
    bedrooms: 2,
    basePrice: '5200000000',
    status: 'AVAILABLE',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let savedListing: ListingEntity | null = null;

  const listingsRepo = {
    count: jest.fn().mockResolvedValue(2),
    save: jest.fn(async (row: Partial<ListingEntity>) => {
      savedListing = {
        id: row.id ?? 'ls_03',
        tenantId: row.tenantId ?? 'ten_dev_01',
        unitId: row.unitId ?? 'un_03',
        title: row.title ?? '',
        description: row.description ?? '',
        highlights: row.highlights ?? [],
        mediaIds: row.mediaIds ?? [],
        priceDisplay: row.priceDisplay ?? null,
        status: row.status ?? 'DRAFT',
        antiDriftStatus: row.antiDriftStatus ?? 'PASS',
        driftReport: row.driftReport ?? null,
        verified: row.verified ?? false,
        rejectReason: row.rejectReason ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        unitVersion: row.unitVersion ?? 1,
        unit,
      } as ListingEntity;
      return savedListing;
    }),
    findOne: jest.fn(async ({ where }: { where: { id?: string; tenantId?: string } }) => {
      if (where.id === 'missing') return null;
      return savedListing;
    }),
  };

  const unitsRepo = {
    findOne: jest.fn(async ({ where }: { where: { id?: string; tenantId?: string } }) => {
      if (where.id === unit.id && where.tenantId === unit.tenantId) return unit;
      return null;
    }),
  };

  const audit = { append: jest.fn().mockResolvedValue(undefined) };
  const searchIndex = { enqueue: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    savedListing = null;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        AntiDriftService,
        { provide: getRepositoryToken(ListingEntity), useValue: listingsRepo },
        { provide: getRepositoryToken(UnitEntity), useValue: unitsRepo },
        { provide: AuditService, useValue: audit },
        { provide: SearchIndexService, useValue: searchIndex },
      ],
    }).compile();

    service = module.get(ListingService);
  });

  it('checkDrift returns BLOCK for large price drift (UAT-04)', async () => {
    const result = await service.checkDrift('ten_dev_01', {
      unitId: 'un_03',
      priceDisplay: 4_500_000_000,
    });
    expect(result.data.status).toBe('BLOCK');
    expect(result.data.basePrice).toBe(5_200_000_000);
    expect(result.data.findings.length).toBeGreaterThan(0);
  });

  it('checkDrift 404 for unknown unit', async () => {
    await expect(
      service.checkDrift('ten_dev_01', { unitId: 'missing', priceDisplay: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create stores anti-drift status on listing', async () => {
    const result = await service.create(
      'ten_dev_01',
      {
        unitId: 'un_03',
        expectedUnitVersion: 1,
        title: 'Test',
        description: 'Desc',
        priceDisplay: 5_200_000_000,
      },
      'agent_1',
    );
    expect(result.data.attributes.antiDriftStatus).toBe('PASS');
    expect(result.data.attributes.unitVersion).toBe(1);
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', actorId: 'agent_1' }),
    );
  });

  it('submitReview rejects BLOCK listings', async () => {
    savedListing = {
      id: 'ls_block',
      tenantId: 'ten_dev_01',
      unitId: 'un_03',
      unitVersion: 1,
      title: 'Blocked',
      description: 'x',
      highlights: [],
      mediaIds: [],
      priceDisplay: '4500000000',
      status: 'DRAFT',
      antiDriftStatus: 'BLOCK',
      driftReport: null,
      verified: false,
      rejectReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ListingEntity;

    await expect(service.submitReview('ten_dev_01', 'ls_block')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
