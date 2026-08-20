import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitEntity } from '../../database/entities/unit.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { SearchIndexService } from '../search/search-index.service';
import { ListingService } from '../listing/listing.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { GoldenRecordService } from './golden-record.service';

describe('GoldenRecordService', () => {
  let service: GoldenRecordService;
  let units: jest.Mocked<
    Pick<Repository<UnitEntity>, 'createQueryBuilder' | 'findOne' | 'find' | 'save' | 'manager'>
  >;
  let auditEvents: jest.Mocked<Pick<Repository<AuditEventEntity>, 'find'>>;

  const mockUnit: UnitEntity = {
    id: 'un_01',
    tenantId: 'ten_dev_01',
    projectId: 'prj_sunrise',
    code: 'A-12-05',
    floor: 12,
    area: '68.00',
    bedrooms: 2,
    basePrice: '3850000000',
    status: 'AVAILABLE',
    version: 3,
    createdAt: new Date('2026-06-01T08:00:00.000Z'),
    updatedAt: new Date('2026-07-28T10:00:00.000Z'),
  };

  beforeEach(async () => {
    const getMany = jest.fn().mockResolvedValue([mockUnit]);
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany,
    };

    units = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn().mockResolvedValue({ ...mockUnit }),
      find: jest.fn().mockResolvedValue([{ ...mockUnit }]),
      save: jest.fn().mockImplementation(async (u) => ({ ...u, version: (u.version ?? 0) + 1 })),
      manager: {
        transaction: jest.fn(async (cb) =>
          cb({ getRepository: () => units }),
        ),
      },
    } as unknown as jest.Mocked<
      Pick<Repository<UnitEntity>, 'createQueryBuilder' | 'findOne' | 'find' | 'save' | 'manager'>
    >;

    const projects = {
      findOne: jest.fn().mockResolvedValue({
        id: 'prj_sunrise',
        tenantId: 'ten_dev_01',
        code: 'SUNRISE-A',
        name: 'Sunrise Tower A',
      }),
    };

    auditEvents = {
      find: jest.fn().mockResolvedValue([
        {
          id: '1',
          action: 'PATCH',
          actorId: 'usr_dev_admin',
          createdAt: new Date('2026-07-01T08:00:00.000Z'),
          payload: {
            reason: 'Phase 1 adjust',
            before: { basePrice: '3600000000', status: 'AVAILABLE', version: 1 },
            after: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
          },
        },
        {
          id: '2',
          action: 'PATCH',
          actorId: 'usr_dev_admin',
          createdAt: new Date('2026-07-15T08:00:00.000Z'),
          payload: {
            reason: 'Market index',
            before: { basePrice: '3750000000', status: 'AVAILABLE', version: 2 },
            after: { basePrice: '3850000000', status: 'AVAILABLE', version: 3 },
          },
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoldenRecordService,
        { provide: getRepositoryToken(UnitEntity), useValue: units },
        { provide: getRepositoryToken(ProjectEntity), useValue: projects },
        { provide: getRepositoryToken(AuditEventEntity), useValue: auditEvents },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: StreamEventsService,
          useValue: { publishUnitStatus: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: SearchIndexService, useValue: { enqueue: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: ListingService,
          useValue: { recheckPublishedDriftForUnit: jest.fn().mockResolvedValue({ unverified: [] }) },
        },
      ],
    }).compile();

    service = module.get(GoldenRecordService);
  });

  it('maps units to OpenAPI row shape', async () => {
    const result = await service.listUnits({ tenantId: 'ten_dev_01' });
    expect(result.data[0].attributes.basePrice).toBe(3850000000);
  });

  it('patches unit when expectedVersion matches', async () => {
    const result = await service.patchUnit('ten_dev_01', 'un_01', {
      basePrice: 3900000000,
      expectedVersion: 3,
      reason: 'Market adjust',
    });
    expect(result.data.attributes.basePrice).toBe(3900000000);
    expect(units.save).toHaveBeenCalled();
  });

  it('forbids AGENT from PATCHing unit price (OPS-S3-02)', async () => {
    await expect(
      service.patchUnit(
        'ten_dev_01',
        'un_01',
        { basePrice: 1, expectedVersion: 3 },
        'usr_agent_01',
        'AGENT',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(units.save).not.toHaveBeenCalled();
  });

  it('throws conflict when expectedVersion mismatches', async () => {
    await expect(
      service.patchUnit('ten_dev_01', 'un_01', { expectedVersion: 99, basePrice: 1 }),
    ).rejects.toThrow();
  });

  it('returns product graph for project', async () => {
    const result = await service.getProductGraph('ten_dev_01', 'prj_sunrise');
    expect(result.data.project.id).toBe('prj_sunrise');
    expect(result.meta.uc).toBe('UC-GR-04');
    expect(result.data.buildings.length).toBeGreaterThan(0);
  });

  it('previews unit import diff (UC-GR-06)', async () => {
    const csv = `code,floor,area,bedrooms,basePrice,status
A-12-05,12,68,2,3900000000,AVAILABLE
A-16-01,16,88,3,4800000000,AVAILABLE`;

    const result = await service.previewUnitImport('ten_dev_01', {
      projectId: 'prj_sunrise',
      csvText: csv,
    });

    expect(result.meta.createCount).toBe(1);
    expect(result.meta.updateCount).toBe(1);
    expect(result.data.rows[0].diffAction).toBe('UPDATE');
  });

  it('returns unit version history (UC-GR-05)', async () => {
    const result = await service.getUnitVersions('ten_dev_01', 'un_01');
    expect(result.meta.screen).toBe('SCR-DEV-011');
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.data[0].attributes.basePrice).toBe(3850000000);
  });

  it('returns snapshot at historical time (UC-GR-05)', async () => {
    const result = await service.getUnitSnapshotAt('ten_dev_01', 'un_01', '2026-07-10T12:00:00.000Z');
    expect(result.data.attributes.basePrice).toBe(3750000000);
    expect(result.data.attributes.version).toBe(2);
  });
});
