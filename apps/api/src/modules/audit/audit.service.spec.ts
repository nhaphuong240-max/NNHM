import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let rows: AuditEventEntity[];

  beforeEach(async () => {
    rows = [
      {
        id: '1',
        tenantId: 'ten_dev_01',
        entityType: 'unit',
        entityId: 'un_01',
        action: 'PATCH',
        payload: { before: { basePrice: '1' }, after: { basePrice: '2' } },
        actorId: 'usr_dev_admin',
        createdAt: new Date('2026-07-28T10:00:00.000Z'),
      } as AuditEventEntity,
      {
        id: '2',
        tenantId: 'ten_dev_01',
        entityType: 'listing',
        entityId: 'ls_01',
        action: 'APPROVE',
        payload: null,
        actorId: 'usr_dev_admin',
        createdAt: new Date('2026-07-27T10:00:00.000Z'),
      } as AuditEventEntity,
    ];

    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => rows),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditEventEntity),
          useValue: {
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => qb),
          },
        },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  it('lists audit events for tenant', async () => {
    const result = await service.list({ tenantId: 'ten_dev_01', limit: 50 });
    expect(result.data).toHaveLength(2);
    expect(result.data[0].attributes.entityType).toBe('unit');
  });

  it('exports CSV with header', async () => {
    const csv = await service.exportCsv({ tenantId: 'ten_dev_01' });
    expect(csv.split('\n')[0]).toContain('entity_type');
  });

  it('filters audit by bookingId (OP-WIN-03)', async () => {
    rows.push({
      id: '3',
      tenantId: 'ten_dev_01',
      entityType: 'payment_intent',
      entityId: 'pi_01',
      action: 'CREATE',
      payload: { bookingId: 'bk_uat01' },
      actorId: null,
      createdAt: new Date('2026-07-26T10:00:00.000Z'),
    } as AuditEventEntity);

    const result = await service.list({ tenantId: 'ten_dev_01', bookingId: 'bk_uat01', limit: 50 });
    expect(result.meta.filters.bookingId).toBe('bk_uat01');
  });
});
