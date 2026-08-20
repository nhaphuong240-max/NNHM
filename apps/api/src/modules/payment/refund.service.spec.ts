import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { RefundEntity } from '../../database/entities/refund.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { InventoryLockService } from '../../infrastructure/redis/inventory-lock.service';
import { AuditService } from '../audit/audit.service';
import { BookingEventsService } from '../booking/booking-events.service';
import { LedgerWriteService } from '../ledger/ledger-write.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { VnpayPaymentAdapter } from './adapters/vnpay-payment.adapter';
import { PaymentGatewayAdminService } from './payment-gateway-admin.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { RefundService } from './refund.service';

const TENANT = 'ten_dev_01';

describe('RefundService', () => {
  let service: RefundService;
  let intent: PaymentIntentEntity;
  let booking: BookingEntity;
  let unit: UnitEntity;
  let refunds: RefundEntity[];

  beforeEach(async () => {
    refunds = [];

    intent = {
      id: 'pi_ref01',
      tenantId: TENANT,
      bookingId: 'bk_ref01',
      amount: '50000000',
      currency: 'VND',
      method: 'MOCK',
      status: 'SUCCEEDED',
      paymentUrl: 'http://mock',
      gatewayRef: 'MOCK_pi_ref01',
      idempotencyKey: null,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };

    booking = {
      id: 'bk_ref01',
      tenantId: TENANT,
      unitId: 'un_01',
      unitVersion: 1,
      leadId: 'ld_01',
      status: 'DEPOSITED',
      lockId: 'lock_bk_ref01',
      lockToken: 'tok_ref01',
      expiresAt: new Date(Date.now() + 86400000),
      depositAmount: '50000000',
      notes: null,
      idempotencyKey: null,
      createdAt: new Date(),
    };

    unit = {
      id: 'un_01',
      tenantId: TENANT,
      projectId: 'prj_sunrise',
      code: 'A-01',
      floor: 1,
      area: '60',
      bedrooms: 2,
      basePrice: '3000000000',
      status: 'RESERVED',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UnitEntity;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        PaymentOrchestratorService,
        MockPaymentAdapter,
        { provide: VnpayPaymentAdapter, useValue: { code: 'VNPAY', refund: jest.fn() } },
        {
          provide: PaymentGatewayAdminService,
          useValue: {
            resolveRules: jest.fn().mockResolvedValue([
              {
                id: 'rule_mock_dev',
                label: 'Dev MOCK default',
                priority: 10,
                match: { method: 'MOCK' },
                primary: 'MOCK',
                fallback: null,
                enabled: true,
              },
            ]),
          },
        },
        {
          provide: LedgerWriteService,
          useValue: {
            writePaymentRefund: jest.fn(async (input) => ({
              journalId: 'jrn_ref01',
              entryId: 'le_ref01',
              debitAccount: 'DEPOSIT_LIABILITY',
              creditAccount: 'CASH_MOCK',
              amount: input.amount,
              balanced: true,
            })),
          },
        },
        {
          provide: InventoryLockService,
          useValue: { releaseLock: jest.fn().mockResolvedValue(true) },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        {
          provide: BookingEventsService,
          useValue: { append: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: StreamEventsService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
            publishUnitStatus: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(RefundEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) => {
              if (where.idempotencyKey) {
                return (
                  refunds.find(
                    (r) => r.tenantId === where.tenantId && r.idempotencyKey === where.idempotencyKey,
                  ) ?? null
                );
              }
              if (where.status) {
                return (
                  refunds.find(
                    (r) =>
                      r.tenantId === where.tenantId &&
                      r.paymentIntentId === where.paymentIntentId &&
                      r.status === where.status,
                  ) ?? null
                );
              }
              return null;
            }),
            find: jest.fn(
              async ({
                where,
                take,
              }: {
                where: { tenantId?: string; paymentIntentId?: string };
                order?: Record<string, string>;
                take?: number;
              }) => {
                let rows = refunds.filter((r) => {
                  if (where.tenantId && r.tenantId !== where.tenantId) return false;
                  if (where.paymentIntentId && r.paymentIntentId !== where.paymentIntentId) {
                    return false;
                  }
                  return true;
                });
                rows = [...rows].sort(
                  (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
                );
                if (take) rows = rows.slice(0, take);
                return rows;
              },
            ),
            save: jest.fn(async (row: RefundEntity) => {
              const saved = { ...row, createdAt: row.createdAt ?? new Date() };
              const idx = refunds.findIndex((r) => r.id === saved.id);
              if (idx >= 0) refunds[idx] = saved;
              else refunds.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(PaymentIntentEntity),
          useValue: {
            findOne: jest.fn(async () => intent),
            save: jest.fn(async (row: PaymentIntentEntity) => {
              intent = row;
              return row;
            }),
          },
        },
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: {
            findOne: jest.fn(async () => booking),
            save: jest.fn(async (row: BookingEntity) => {
              booking = row;
              return row;
            }),
          },
        },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: {
            findOne: jest.fn(async () => unit),
            save: jest.fn(async (row: UnitEntity) => {
              unit = row;
              return row;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(RefundService);
  });

  it('creates refund with ledger reversal and releases unit (UC-PAY-03)', async () => {
    const result = await service.createRefund(TENANT, {
      paymentIntentId: 'pi_ref01',
      reason: 'Customer cancelled',
    });

    expect(result.data.attributes.status).toBe('SUCCEEDED');
    expect(result.data.attributes.ledgerEntryId).toBe('le_ref01');
    expect(intent.status).toBe('REFUNDED');
    expect(booking.status).toBe('REFUNDED');
    expect(unit.status).toBe('AVAILABLE');
    expect(refunds).toHaveLength(1);
  });

  it('rejects refund when payment intent is not SUCCEEDED', async () => {
    intent.status = 'PENDING';

    await expect(
      service.createRefund(TENANT, { paymentIntentId: 'pi_ref01' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('returns same refund for duplicate idempotency key', async () => {
    const key = 'refund-idem-01';
    const first = await service.createRefund(
      TENANT,
      { paymentIntentId: 'pi_ref01' },
      key,
    );
    const second = await service.createRefund(
      TENANT,
      { paymentIntentId: 'pi_ref01' },
      key,
    );

    expect(second.data.id).toBe(first.data.id);
    expect(second.meta?.idempotentReplay).toBe(true);
  });

  it('lists refunds for tenant', async () => {
    await service.createRefund(TENANT, { paymentIntentId: 'pi_ref01' });
    const list = await service.list(TENANT);
    expect(list.data.length).toBeGreaterThanOrEqual(1);
    expect(list.meta.count).toBeGreaterThanOrEqual(1);
  });
});
