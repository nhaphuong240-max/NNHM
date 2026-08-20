import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ListingMediaEntity } from '../../database/entities/listing-media.entity';
import { AuditService } from '../audit/audit.service';
import { ListingMediaService } from './listing-media.service';

const TENANT = 'ten_dev_01';

describe('ListingMediaService', () => {
  let service: ListingMediaService;
  let mediaRows: ListingMediaEntity[];
  let listings: ListingEntity[];

  beforeEach(async () => {
    mediaRows = [];
    listings = [
      {
        id: 'ls_01',
        tenantId: TENANT,
        unitId: 'un_01',
        unitVersion: 1,
        title: 'Test',
        description: 'Desc',
        highlights: [],
        mediaIds: [],
        priceDisplay: null,
        status: 'DRAFT',
        antiDriftStatus: 'PASS',
        driftReport: null,
        verified: false,
        rejectReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingMediaService,
        {
          provide: getRepositoryToken(ListingMediaEntity),
          useValue: {
            find: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              mediaRows
                .filter(
                  (r) =>
                    r.tenantId === where.tenantId &&
                    (!where.listingId || r.listingId === where.listingId),
                )
                .sort((a, b) => a.sortOrder - b.sortOrder),
            ),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              mediaRows.find(
                (r) =>
                  r.tenantId === where.tenantId &&
                  r.id === where.id &&
                  r.listingId === where.listingId,
              ) ?? null,
            ),
            count: jest.fn(
              async ({ where }: { where: { tenantId: string; listingId: string } }) =>
                mediaRows.filter(
                  (r) => r.tenantId === where.tenantId && r.listingId === where.listingId,
                ).length,
            ),
            save: jest.fn(async (row: ListingMediaEntity) => {
              const idx = mediaRows.findIndex((r) => r.id === row.id);
              const saved = { ...row, createdAt: row.createdAt ?? new Date() };
              if (idx >= 0) mediaRows[idx] = saved;
              else mediaRows.push(saved);
              return saved;
            }),
            update: jest.fn(async (_where: unknown, patch: Partial<ListingMediaEntity>) => {
              mediaRows = mediaRows.map((r) => ({ ...r, ...patch }));
              return { affected: mediaRows.length };
            }),
            delete: jest.fn(async ({ id }: { id: string }) => {
              mediaRows = mediaRows.filter((r) => r.id !== id);
            }),
          },
        },
        {
          provide: getRepositoryToken(ListingEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              listings.find((l) => l.id === where.id && l.tenantId === where.tenantId) ?? null,
            ),
            save: jest.fn(async (row: ListingEntity) => {
              const idx = listings.findIndex((l) => l.id === row.id);
              if (idx >= 0) listings[idx] = row;
              return row;
            }),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => '/tmp/listing-media-test') },
        },
      ],
    }).compile();

    service = module.get(ListingMediaService);
  });

  it('uploads media and marks first item as cover (UC-LS-04)', async () => {
    const result = await service.upload(
      TENANT,
      'ls_01',
      {
        buffer: Buffer.from('fake-image'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 11,
      },
      'usr_agent_01',
    );

    expect(result.data.id).toMatch(/^lm_/);
    expect(result.data.attributes.isCover).toBe(true);
    expect(result.data.attributes.scanStatus).toBe('PENDING');
    expect(listings[0].mediaIds).toContain(result.data.id);
  });

  it('runs scan webhook stub to CLEAN', async () => {
    const uploaded = await service.upload(TENANT, 'ls_01', {
      buffer: Buffer.from('x'),
      originalname: 'a.png',
      mimetype: 'image/png',
      size: 1,
    });
    const scanned = await service.runScan(TENANT, 'ls_01', uploaded.data.id);
    expect(scanned.data.attributes.scanStatus).toBe('CLEAN');
  });
});
