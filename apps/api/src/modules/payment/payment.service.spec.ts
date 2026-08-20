import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { SmsPaymentNotifyService } from '../sms/sms-payment-notify.service';
import { SmsService } from '../sms/sms.service';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { VnpayPaymentAdapter } from './adapters/vnpay-payment.adapter';
import { PaymentGatewayAdminService } from './payment-gateway-admin.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { PaymentService } from './payment.service';

const TENANT = 'ten_dev_01';

describe('PaymentService', () => {
  let service: PaymentService;
  let intents: PaymentIntentEntity[];
  let booking: BookingEntity;
  let unit: UnitEntity;

  beforeEach(async () => {
    intents = [];
    unit = {
      id: 'un_01',
      tenantId: TENANT,
      projectId: 'prj_sunrise',
      code: 'A-12-05',
      floor: 12,
      area: '68.00',
      bedrooms: 2,
      basePrice: '3850000000',
      status: 'RESERVED',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    booking = {
      id: 'bk_test01',
      tenantId: TENANT,
      unitId: 'un_01',
      unitVersion: 1,
      leadId: 'ld_01',
      status: 'RESERVED',
      lockId: 'lock_bk_test01',
      lockToken: 'tok',
      expiresAt: new Date(Date.now() + 86400000),
      depositAmount: '50000000',
      notes: null,
      idempotencyKey: null,
      createdAt: new Date(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        PaymentOrchestratorService,
        MockPaymentAdapter,
        VnpayPaymentAdapter,
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
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: unknown) => fallback) },
        },
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: {
            findOne: jest.fn(async () => booking),
          },
        },
        {
          provide: getRepositoryToken(PaymentIntentEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) => {
              if (where.id) {
                return intents.find((i) => i.id === where.id && i.tenantId === where.tenantId) ?? null;
              }
              return (
                intents.find(
                  (i) =>
                    i.tenantId === where.tenantId && i.idempotencyKey === where.idempotencyKey,
                ) ?? null
              );
            }),
            save: jest.fn(async (row: PaymentIntentEntity) => {
              const saved = { ...row, createdAt: new Date() };
              intents.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(UnitEntity),
          useValue: {
            findOne: jest.fn(async () => unit),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: StreamEventsService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: SmsPaymentNotifyService,
          useValue: { sendPaymentOtp: jest.fn().mockResolvedValue({ sent: true, otp: '123456' }) },
        },
        {
          provide: SmsService,
          useValue: { getPaymentOtp: jest.fn().mockResolvedValue('123456') },
        },
        {
          provide: RailResolverService,
          useValue: {
            resolve: jest.fn().mockResolvedValue({
              paymentMethod: 'MOCK',
              vnpaySandbox: true,
              simulateEndpoints: true,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
  });

  it('creates PENDING payment intent with sandbox redirect URL', async () => {
    const result = await service.createIntent(TENANT, {
      bookingId: 'bk_test01',
      amount: 50_000_000,
      method: 'MOCK',
    });

    expect(result.data.id).toMatch(/^pi_/);
    expect(result.data.attributes.status).toBe('PENDING');
    expect(result.data.attributes.paymentUrl).toContain('intentId=');
    expect(result.data.attributes.bookingId).toBe('bk_test01');
  });

  it('returns public checkout summary for buyer page', async () => {
    const created = await service.createIntent(TENANT, {
      bookingId: 'bk_test01',
      amount: 50_000_000,
      method: 'MOCK',
    });

    const checkout = await service.getCheckout(TENANT, created.data.id);
    expect(checkout.data.booking.id).toBe('bk_test01');
    expect(checkout.data.booking.unitCode).toBe('A-12-05');
    expect(checkout.data.paymentUrl).toContain('mock/complete');
  });

  it('rejects payment when booking not RESERVED', async () => {
    booking.status = 'EXPIRED';

    await expect(
      service.createIntent(TENANT, { bookingId: 'bk_test01', amount: 50_000_000, method: 'MOCK' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('returns 404 when booking missing', async () => {
    booking = null as unknown as BookingEntity;
    const bookingsRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        PaymentOrchestratorService,
        MockPaymentAdapter,
        VnpayPaymentAdapter,
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
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: unknown) => fallback) },
        },
        { provide: getRepositoryToken(BookingEntity), useValue: bookingsRepo },
        { provide: getRepositoryToken(UnitEntity), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(PaymentIntentEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: AuditService, useValue: { append: jest.fn() } },
        { provide: StreamEventsService, useValue: { publish: jest.fn() } },
        {
          provide: SmsPaymentNotifyService,
          useValue: { sendPaymentOtp: jest.fn().mockResolvedValue({ sent: true, otp: '123456' }) },
        },
        {
          provide: SmsService,
          useValue: { getPaymentOtp: jest.fn().mockResolvedValue('123456') },
        },
        {
          provide: RailResolverService,
          useValue: {
            resolve: jest.fn().mockResolvedValue({
              paymentMethod: 'MOCK',
              vnpaySandbox: true,
              simulateEndpoints: true,
            }),
          },
        },
      ],
    }).compile();

    await expect(
      module.get(PaymentService).createIntent(TENANT, {
        bookingId: 'bk_missing',
        amount: 1,
        method: 'MOCK',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
