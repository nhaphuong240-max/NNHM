import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { InventoryLockService } from '../../infrastructure/redis/inventory-lock.service';
import { RefundService } from '../payment/refund.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { TenantWebhookService } from '../tenant-webhooks/tenant-webhook.service';
import { BookingEventsService } from './booking-events.service';
import { BookingService } from './booking.service';

const TENANT = 'ten_dev_01';

function makeUnit(overrides: Partial<UnitEntity> = {}): UnitEntity {
  return {
    id: 'un_01',
    tenantId: TENANT,
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
    ...overrides,
  } as UnitEntity;
}

describe('BookingService', () => {
  let service: BookingService;
  let units: UnitEntity[];
  let bookings: BookingEntity[];
  let intents: PaymentIntentEntity[];
  let lockStore: Map<string, string>;
  let refundServiceMock: { createRefund: jest.Mock };
  let lockService: Pick<
    InventoryLockService,
    'acquireLock' | 'releaseLock' | 'getHolder'
  >;

  beforeEach(async () => {
    units = [makeUnit()];
    bookings = [];
    intents = [];
    lockStore = new Map();

    refundServiceMock = {
      createRefund: jest.fn().mockResolvedValue({
        data: {
          id: 'rf_test01',
          attributes: {
            status: 'SUCCEEDED',
            bookingId: 'bk_test01',
            paymentIntentId: 'pi_test01',
            amount: 50_000_000,
            currency: 'VND',
            ledgerEntryId: 'le_ref01',
            createdAt: new Date().toISOString(),
          },
        },
      }),
    };

    lockService = {
      acquireLock: jest.fn(async (tenantId, unitId, bookingId, _ttl) => {
        const key = `${tenantId}:lock:unit:${unitId}`;
        if (lockStore.has(key)) return null;
        const token = `tok_${bookingId}`;
        lockStore.set(key, `${bookingId}|${token}`);
        return token;
      }),
      releaseLock: jest.fn(async (tenantId, unitId, lockToken) => {
        const key = `${tenantId}:lock:unit:${unitId}`;
        const raw = lockStore.get(key);
        if (!raw) return false;
        const [, stored] = raw.split('|');
        if (stored !== lockToken) return false;
        lockStore.delete(key);
        return true;
      }),
      getHolder: jest.fn(async (tenantId, unitId) => {
        const raw = lockStore.get(`${tenantId}:lock:unit:${unitId}`);
        if (!raw) return null;
        const [bookingId, lockToken] = raw.split('|');
        return { bookingId, lockToken };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: InventoryLockService, useValue: lockService },
        {
          provide: StreamEventsService,
          useValue: { publishUnitStatus: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: RefundService,
          useValue: refundServiceMock,
        },
        {
          provide: BookingEventsService,
          useValue: {
            append: jest.fn().mockResolvedValue({}),
            ensureBaselineEvents: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TenantWebhookService,
          useValue: { emitEvent: jest.fn().mockResolvedValue({ data: { delivered: 0, deliveries: [] } }) },
        },
        {
          provide: getRepositoryToken(PaymentIntentEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              intents.find(
                (i) =>
                  i.tenantId === where.tenantId &&
                  (!where.bookingId || i.bookingId === where.bookingId) &&
                  (!where.id || i.id === where.id) &&
                  (!where.status || i.status === where.status),
              ) ?? null,
            ),
          },
        },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
              units.find((u) => u.id === where.id && u.tenantId === where.tenantId) ?? null,
            ),
            save: jest.fn(async (unit: UnitEntity) => {
              const idx = units.findIndex((u) => u.id === unit.id);
              if (idx >= 0) units[idx] = unit;
              return unit;
            }),
          },
        },
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) => {
              if (where.idempotencyKey) {
                return (
                  bookings.find(
                    (b) =>
                      b.tenantId === where.tenantId &&
                      b.idempotencyKey === where.idempotencyKey,
                  ) ?? null
                );
              }
              return (
                bookings.find(
                  (b) => b.id === where.id && b.tenantId === where.tenantId,
                ) ?? null
              );
            }),
            save: jest.fn(async (row: BookingEntity) => {
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
              };
              const idx = bookings.findIndex((b) => b.id === saved.id);
              if (idx >= 0) bookings[idx] = saved;
              else bookings.push(saved);
              return saved;
            }),
            findOneOrFail: jest.fn(async ({ where }: { where: Record<string, string> }) => {
              const row = bookings.find(
                (b) => b.id === where.id && b.tenantId === where.tenantId,
              );
              if (!row) throw new Error('not found');
              return row;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(BookingService);
  });

  const VERSION = 1;
  const bookingInput = (unitId: string, extra: Record<string, unknown> = {}) => ({
    unitId,
    expectedUnitVersion: VERSION,
    ...extra,
  });

  it('creates RESERVED booking with Redis lock', async () => {
    const result = await service.create(TENANT, bookingInput('un_01', {
      leadId: 'ld_01',
      depositAmount: 50_000_000,
      expiryHours: 48,
    }));

    expect(result.data.id).toMatch(/^bk_/);
    expect(result.data.attributes.status).toBe('RESERVED');
    expect(result.data.attributes.lockId).toBe(`lock_${result.data.id}`);
    expect(result.data.attributes.unitId).toBe('un_01');
    expect(result.data.attributes.unitVersion).toBe(1);
    expect(new Date(result.data.attributes.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(units[0].status).toBe('RESERVED');
    expect(lockStore.size).toBe(1);
  });

  it('returns same booking for duplicate idempotency key', async () => {
    const key = 'idem-mobile-01';
    const first = await service.create(TENANT, bookingInput('un_01', { leadId: 'ld_01' }), key);
    const second = await service.create(TENANT, bookingInput('un_01', { leadId: 'ld_02' }), key);

    expect(second.data.id).toBe(first.data.id);
    expect(second.meta?.idempotentReplay).toBe(true);
  });

  it('throws 409 when unit already locked', async () => {
    await service.create(TENANT, bookingInput('un_01', { leadId: 'ld_01' }));

    await expect(
      service.create(TENANT, bookingInput('un_01', { leadId: 'ld_02' })),
    ).rejects.toThrow(ConflictException);
  });

  it('allows only one concurrent booking per unit (0 double-book)', async () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      service.create(TENANT, bookingInput('un_01', { leadId: `ld_${i}` })),
    );

    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const conflicts = results.filter(
      (r) => r.status === 'rejected' && r.reason instanceof ConflictException,
    );

    expect(ok).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
    expect(bookings).toHaveLength(1);
  });

  it('expireBooking releases lock and restores unit (BR-17)', async () => {
    await service.create(TENANT, bookingInput('un_01', { leadId: 'ld_01' }));
    const row = bookings[0];

    await service.expireBooking(row);

    expect(row.status).toBe('EXPIRED');
    expect(units[0].status).toBe('AVAILABLE');
    expect(lockStore.size).toBe(0);
  });

  it('cancelBooking on DEPOSITED triggers refund path (API-057)', async () => {
    bookings.push({
      id: 'bk_test01',
      tenantId: TENANT,
      unitId: 'un_01',
      unitVersion: 1,
      leadId: 'ld_01',
      status: 'DEPOSITED',
      lockId: 'lock_bk_test01',
      lockToken: 'tok_test01',
      expiresAt: new Date(Date.now() + 86400000),
      depositAmount: '50000000',
      notes: null,
      idempotencyKey: null,
      createdAt: new Date(),
    });
    intents.push({
      id: 'pi_test01',
      tenantId: TENANT,
      bookingId: 'bk_test01',
      amount: '50000000',
      currency: 'VND',
      method: 'MOCK',
      status: 'SUCCEEDED',
      paymentUrl: 'http://mock',
      gatewayRef: 'MOCK_pi_test01',
      idempotencyKey: null,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    });

    const refunds = refundServiceMock;
    const result = await service.cancelBooking(TENANT, 'bk_test01', {
      reason: 'Buyer withdrew',
      initiateRefund: true,
    });

    expect(refunds.createRefund).toHaveBeenCalledWith(
      TENANT,
      { paymentIntentId: 'pi_test01', reason: 'Buyer withdrew' },
      undefined,
      undefined,
    );
    expect(result.refund?.id).toBe('rf_test01');
  });

  it('cancelBooking on RESERVED releases lock without refund', async () => {
    await service.create(TENANT, bookingInput('un_01', { leadId: 'ld_01' }));
    const row = bookings[0];

    const result = await service.cancelBooking(TENANT, row.id, { reason: 'Changed mind' });

    expect(result.data.attributes.status).toBe('CANCELLED');
    expect(units[0].status).toBe('AVAILABLE');
    expect(lockStore.size).toBe(0);
  });

  it('throws 409 on GR version mismatch', async () => {
    await expect(
      service.create(TENANT, { unitId: 'un_01', expectedUnitVersion: 99, leadId: 'ld_01' }),
    ).rejects.toThrow(ConflictException);
  });
});
