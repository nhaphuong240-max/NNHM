import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingDomainEventEntity } from '../../database/entities/booking-domain-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { BookingEventsService } from './booking-events.service';

const TENANT = 'ten_dev_01';

describe('BookingEventsService', () => {
  let service: BookingEventsService;
  let events: BookingDomainEventEntity[];

  beforeEach(async () => {
    events = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingEventsService,
        {
          provide: getRepositoryToken(BookingDomainEventEntity),
          useValue: {
            save: jest.fn(async (row: BookingDomainEventEntity) => {
              events.push({ ...row, occurredAt: row.occurredAt ?? new Date() });
              return row;
            }),
            count: jest.fn(async () => events.length),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn(async () =>
                [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()),
              ),
            })),
          },
        },
        {
          provide: getRepositoryToken(PaymentIntentEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(BookingEventsService);
  });

  it('appends domain events with generated id', async () => {
    const row = await service.append({
      tenantId: TENANT,
      bookingId: 'bk_test01',
      eventType: 'BookingCreated',
      category: 'state',
      payload: { unitId: 'un_01' },
    });

    expect(row.id).toMatch(/^evt_/);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('BookingCreated');
  });

  it('builds human timeline ordered ascending', async () => {
    await service.append({
      tenantId: TENANT,
      bookingId: 'bk_test01',
      eventType: 'BookingCreated',
      category: 'state',
      payload: { unitCode: 'A-12-05' },
    });
    await service.append({
      tenantId: TENANT,
      bookingId: 'bk_test01',
      eventType: 'PaymentSucceeded',
      category: 'payment',
      payload: { amount: 50_000_000, ledgerEntryId: 'le_01' },
    });

    const timeline = await service.buildTimeline(TENANT, 'bk_test01');
    expect(timeline).toHaveLength(2);
    expect(timeline[0].event).toBe('BookingCreated');
    expect(timeline[1].description).toContain('Thanh toán cọc');
  });

  it('bootstraps baseline events when store empty', async () => {
    const booking = {
      id: 'bk_seed01',
      tenantId: TENANT,
      unitId: 'un_01',
      leadId: 'ld_01',
      status: 'RESERVED',
      lockId: 'lock_1',
      lockToken: 'tok',
      expiresAt: new Date(),
      depositAmount: '50000000',
      notes: null,
      idempotencyKey: null,
      createdAt: new Date(),
    } as BookingEntity;

    await service.ensureBaselineEvents(booking);
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.eventType === 'BookingCreated')).toBe(true);
  });

  it('builds replay pack with reconstructed states (SCR-ADMIN-006)', async () => {
    await service.append({
      tenantId: TENANT,
      bookingId: 'bk_test01',
      eventType: 'BookingCreated',
      category: 'state',
      payload: { status: 'RESERVED' },
    });
    await service.append({
      tenantId: TENANT,
      bookingId: 'bk_test01',
      eventType: 'PaymentSucceeded',
      category: 'payment',
      payload: { amount: 50000000 },
    });

    const pack = await service.buildReplayPack(TENANT, 'bk_test01', 'DEPOSITED');
    expect(pack.domainEvents).toHaveLength(2);
    expect(pack.reconstructedStates.at(-1)?.inferredStatus).toBe('DEPOSITED');
  });

  it('exports domain events CSV (OP-WIN-03)', async () => {
    await service.append({
      tenantId: TENANT,
      bookingId: 'bk_csv01',
      eventType: 'BookingCreated',
      category: 'state',
      payload: { status: 'RESERVED' },
    });

    const events = await service.listDomainEvents(TENANT, 'bk_csv01');
    const csv = service.exportDomainEventsCsv(TENANT, 'bk_csv01', events);
    expect(csv.split('\n')[0]).toContain('event_type');
    expect(csv).toContain('BookingCreated');
  });
});
