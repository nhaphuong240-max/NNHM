import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { SearchIndexDocEntity } from '../../database/entities/search-index-doc.entity';
import { SearchOutboxEntity } from '../../database/entities/search-outbox.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { SearchIndexService } from './search-index.service';

describe('SearchIndexService', () => {
  let service: SearchIndexService;
  let outboxRows: SearchOutboxEntity[];
  let docs: Map<string, SearchIndexDocEntity>;

  const unit: UnitEntity = {
    id: 'un_01',
    tenantId: 'ten_dev_01',
    projectId: 'prj_sunrise',
    code: 'A-12-05',
    floor: 12,
    area: '68.00',
    bedrooms: 2,
    basePrice: '3850000000',
    status: 'AVAILABLE',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const listing: ListingEntity = {
    id: 'ls_un01',
    tenantId: 'ten_dev_01',
    unitId: 'un_01',
    unitVersion: 1,
    title: 'Căn 2PN view sông',
    description: 'Full nội thất',
    highlights: ['View sông'],
    mediaIds: [],
    priceDisplay: '3850000000',
    status: 'PUBLISHED',
    antiDriftStatus: 'PASS',
    driftReport: null,
    verified: true,
    rejectReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    unit,
  } as ListingEntity;

  beforeEach(async () => {
    outboxRows = [];
    docs = new Map();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexService,
        {
          provide: getRepositoryToken(SearchOutboxEntity),
          useValue: {
            save: jest.fn(async (row: SearchOutboxEntity) => {
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
              };
              const idx = outboxRows.findIndex((r) => r.id === saved.id);
              if (idx >= 0) outboxRows[idx] = saved;
              else outboxRows.push(saved);
              return saved;
            }),
            find: jest.fn(async () => outboxRows.filter((r) => r.status === 'PENDING')),
            findOne: jest.fn(async (opts: { where: { id?: string; tenantId?: string; status?: string } }) => {
              const where = opts?.where ?? {};
              if (where.id && where.status === 'PENDING' && where.tenantId) {
                return (
                  outboxRows.find(
                    (r) =>
                      r.tenantId === where.tenantId &&
                      r.status === 'PENDING',
                  ) ?? null
                );
              }
              return outboxRows.find((r) => r.id === where.id) ?? null;
            }),
            count: jest.fn(async ({ where }: { where?: { status?: string } }) =>
              outboxRows.filter((r) => !where?.status || r.status === where.status).length,
            ),
          },
        },
        {
          provide: getRepositoryToken(SearchIndexDocEntity),
          useValue: {
            save: jest.fn(async (row: SearchIndexDocEntity) => {
              docs.set(row.id, row);
              return row;
            }),
            delete: jest.fn(async ({ id }: { id: string }) => {
              docs.delete(id);
            }),
            count: jest.fn(async () => docs.size),
            findOne: jest.fn(async () => [...docs.values()][0] ?? null),
          },
        },
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: {
            find: jest.fn(async () => [listing]),
            findOne: jest.fn(async (opts: { where: { id?: string; tenantId?: string } }) => {
              const where = opts?.where ?? {};
              if (where.id === listing.id && where.tenantId === listing.tenantId) {
                return listing;
              }
              return null;
            }),
          },
        },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { id?: string } }) =>
              where.id === unit.id ? unit : null,
            ),
          },
        },
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: {
            findOne: jest.fn(async () => ({ id: 'prj_sunrise', name: 'Sunrise Tower A' })),
          },
        },
      ],
    }).compile();

    service = module.get(SearchIndexService);
  });

  it('enqueues and indexes published listing', async () => {
    await service.enqueue({
      tenantId: 'ten_dev_01',
      entityType: 'listing',
      entityId: 'ls_un01',
      operation: 'UPSERT',
    });

    expect(outboxRows[0].status).toBe('PROCESSED');
    expect(docs.has('un_01')).toBe(true);
    expect(docs.get('un_01')?.title).toBe('Căn 2PN view sông');
  });

  it('deletes index doc on DELETE operation', async () => {
    docs.set('un_01', { id: 'un_01' } as SearchIndexDocEntity);

    await service.enqueue({
      tenantId: 'ten_dev_01',
      entityType: 'unit',
      entityId: 'un_01',
      operation: 'DELETE',
      payload: { unitId: 'un_01' },
    });

    expect(docs.has('un_01')).toBe(false);
  });

  it('reports index status with lag metric', async () => {
    docs.set('un_01', { ...listing, id: 'un_01', indexedAt: new Date() } as unknown as SearchIndexDocEntity);

    const status = await service.getStatus('ten_dev_01');
    expect(status.docCount).toBe(1);
    expect(status.source).toBe('postgres-search-index');
  });
});
