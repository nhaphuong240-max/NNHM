import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { SearchIndexService } from './search-index.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  const doc: SearchIndexDocEntity = {
    id: 'un_01',
    tenantId: 'ten_dev_01',
    listingId: 'ls_un01',
    projectName: 'Sunrise Tower A',
    title: 'Test listing',
    code: 'A-12-05',
    basePrice: '3850000000',
    bedrooms: 2,
    area: '68.00',
    verified: true,
    searchText: 'test listing a-12-05 sunrise tower a desc',
    detail: {
      listingId: 'ls_un01',
      description: 'Desc',
      highlights: ['A'],
      priceDisplay: 3850000000,
      floor: 12,
      unitStatus: 'AVAILABLE',
      antiDriftStatus: 'PASS',
      projectId: 'prj_sunrise',
    },
    indexedAt: new Date(),
    updatedAt: new Date(),
  };

  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([doc]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(SearchIndexDocEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => qb),
            findOne: jest.fn(async ({ where }: { where: { id?: string } }) =>
              where.id === 'un_01' ? doc : null,
            ),
            find: jest.fn().mockResolvedValue([doc]),
          },
        },
        {
          provide: SearchIndexService,
          useValue: {
            getStatus: jest.fn().mockResolvedValue({
              lagMs: 120,
              docCount: 1,
              outbox: { pending: 0, failed: 0 },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('searches indexed docs with search-index source', async () => {
    const result = await service.searchUnits({ tenantId: 'ten_dev_01', bedrooms: 2 });
    expect(result.data[0].id).toBe('un_01');
    expect(result.meta.source).toBe('search-index');
    expect(result.meta.indexLagMs).toBe(120);
  });

  it('returns published unit detail from index', async () => {
    const result = await service.getUnitDetail('ten_dev_01', 'un_01');
    expect(result.data.id).toBe('un_01');
    expect(result.data.attributes.verified).toBe(true);
    expect(result.meta.source).toBe('search-index');
  });

  it('404 when unit not in index', async () => {
    await expect(service.getUnitDetail('ten_dev_01', 'un_missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns ranked recommendations (UC-AI-06)', async () => {
    const result = await service.recommendUnits({
      tenantId: 'ten_dev_01',
      seedUnitId: 'un_01',
      limit: 3,
    });
    expect(result.meta.uc).toContain('UC-AI-06');
    expect(Array.isArray(result.data)).toBe(true);
  });
});
