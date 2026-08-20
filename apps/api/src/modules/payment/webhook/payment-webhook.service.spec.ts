import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../../database/entities/booking.entity';
import { LedgerEntryEntity } from '../../../database/entities/ledger-entry.entity';
import { LedgerJournalEntity } from '../../../database/entities/ledger-journal.entity';
import { PaymentIntentEntity } from '../../../database/entities/payment-intent.entity';
import { PaymentWebhookEventEntity } from '../../../database/entities/payment-webhook-event.entity';
import { RefundEntity } from '../../../database/entities/refund.entity';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';
import { AuditService } from '../../audit/audit.service';
import { BookingEventsService } from '../../booking/booking-events.service';
import { LedgerWriteService } from '../../ledger/ledger-write.service';
import { RefundService } from '../refund.service';
import { StreamEventsService } from '../../stream/stream-events.service';
import { ZaloPaymentNotifyService } from '../../zalo/zalo-payment-notify.service';
import { SmsPaymentNotifyService } from '../../sms/sms-payment-notify.service';
import { TenantWebhookService } from '../../tenant-webhooks/tenant-webhook.service';
import { PaymentWebhookService } from './payment-webhook.service';
import { ReconciliationService } from '../../ledger/reconciliation.service';
import type { PaymentWebhookPayload } from './webhook.types';
import { signWebhookPayload } from './webhook-signature.util';
import { WebhookIdempotencyService } from './webhook-idempotency.service';

const TENANT = 'ten_dev_01';
const SECRET = 'test-webhook-secret';

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let intent: PaymentIntentEntity;
  let booking: BookingEntity;
  let refund: RefundEntity;
  let webhookEvents: PaymentWebhookEventEntity[];
  let journals: LedgerJournalEntity[];
  let ledgerEntries: LedgerEntryEntity[];
  let redisStore: Map<string, string>;
  const notifyPaymentSuccess = jest.fn();
  const notifySmsSuccess = jest.fn();

  const basePayload: PaymentWebhookPayload = {
    eventId: 'evt_test_01',
    eventType: 'payment.success',
    transactionId: 'MOCK_TXN_01',
    amount: 50_000_000,
    paymentIntentId: 'pi_test01',
    tenantId: TENANT,
    timestamp: new Date().toISOString(),
  };

  function signedPayload(overrides: Partial<PaymentWebhookPayload> = {}) {
    const payload = { ...basePayload, ...overrides };
    const signature = signWebhookPayload(payload, SECRET);
    return { payload, signature };
  }

  beforeEach(async () => {
    webhookEvents = [];
    journals = [];
    ledgerEntries = [];
    redisStore = new Map();
    notifyPaymentSuccess.mockReset();
    notifySmsSuccess.mockReset();
    notifyPaymentSuccess.mockResolvedValue({
      sent: true,
      deliveryId: 'zns_pay01',
      status: 'SENT',
      providerRef: 'sandbox_zns_pay01',
      sandbox: true,
    });

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

    refund = {
      id: 'rf_test01',
      tenantId: TENANT,
      bookingId: 'bk_test01',
      paymentIntentId: 'pi_test01',
      amount: '50000000',
      currency: 'VND',
      status: 'PENDING',
      gatewayRef: 'VNPAY_REFUND',
      reason: 'Cancel',
      idempotencyKey: null,
      ledgerEntryId: null,
      createdAt: new Date(),
    };

    intent = {
      id: 'pi_test01',
      tenantId: TENANT,
      bookingId: 'bk_test01',
      amount: '50000000',
      currency: 'VND',
      method: 'MOCK',
      status: 'PENDING',
      paymentUrl: 'http://mock',
      gatewayRef: 'MOCK_pi_test01',
      idempotencyKey: null,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };

    const ledgerWrite: Pick<LedgerWriteService, 'writePaymentSuccess' | 'writePaymentRefund'> = {
      writePaymentSuccess: jest.fn(async (input) => {
        const existing = journals.find((j) => j.webhookEventId === input.webhookEventId);
        if (existing) {
          const debit = ledgerEntries.find(
            (e) => e.journalId === existing.id && e.side === 'DEBIT',
          );
          return {
            journalId: existing.id,
            entryId: debit?.id ?? existing.id,
            debitAccount: debit?.account ?? 'CASH_MOCK',
            creditAccount: 'DEPOSIT_LIABILITY',
            amount: input.amount,
            balanced: true,
          };
        }

        const journalId = `jrn_${journals.length + 1}`;
        const debitId = `le_debit_${journals.length + 1}`;
        const creditId = `le_credit_${journals.length + 1}`;
        journals.push({
          id: journalId,
          tenantId: input.tenantId,
          webhookEventId: input.webhookEventId,
          bookingId: input.bookingId,
          paymentIntentId: input.paymentIntentId,
          reference: input.transactionId,
          postedAt: new Date(),
        });
        ledgerEntries.push(
          {
            id: debitId,
            journalId,
            tenantId: input.tenantId,
            account: 'CASH_MOCK',
            side: 'DEBIT',
            amount: String(input.amount),
            currency: 'VND',
            referenceType: 'payment',
            referenceId: input.paymentIntentId,
            postedAt: new Date(),
          },
          {
            id: creditId,
            journalId,
            tenantId: input.tenantId,
            account: 'DEPOSIT_LIABILITY',
            side: 'CREDIT',
            amount: String(input.amount),
            currency: 'VND',
            referenceType: 'payment',
            referenceId: input.paymentIntentId,
            postedAt: new Date(),
          },
        );

        return {
          journalId,
          entryId: debitId,
          debitAccount: 'CASH_MOCK',
          creditAccount: 'DEPOSIT_LIABILITY',
          amount: input.amount,
          balanced: true,
        };
      }),
      writePaymentRefund: jest.fn(async (input) => ({
        journalId: 'jrn_ref01',
        entryId: 'le_ref01',
        debitAccount: 'DEPOSIT_LIABILITY',
        creditAccount: 'CASH_VNPAY',
        amount: input.amount,
        balanced: true,
      })),
    };

    const refundService: Pick<RefundService, 'completeRefund'> = {
      completeRefund: jest.fn(async (row) => {
        refund = { ...row, status: 'SUCCEEDED', ledgerEntryId: 'le_ref01' };
        intent = { ...intent, status: 'REFUNDED' };
        booking = { ...booking, status: 'REFUNDED' };
        return refund;
      }),
    };

    notifySmsSuccess.mockResolvedValue({ sent: false, skipped: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        WebhookIdempotencyService,
        {
          provide: LedgerWriteService,
          useValue: ledgerWrite,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              if (key === 'WEBHOOK_HMAC_SECRET') return SECRET;
              return fallback;
            }),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            set: jest.fn(async (key: string, _val: string, ...args: string[]) => {
              const nx = args.includes('NX');
              if (nx && redisStore.has(key)) return null;
              redisStore.set(key, '1');
              return nx ? 'OK' : 'OK';
            }),
          },
        },
        {
          provide: getRepositoryToken(PaymentWebhookEventEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: { eventId?: string } }) =>
              webhookEvents.find((e) => e.eventId === where.eventId) ?? null,
            ),
            save: jest.fn(async (row: PaymentWebhookEventEntity) => {
              const existingIdx = webhookEvents.findIndex((e) => e.eventId === row.eventId);
              const saved = {
                ...row,
                id: row.id ?? String(webhookEvents.length + 1),
                createdAt: row.createdAt ?? new Date(),
              };
              if (existingIdx >= 0) webhookEvents[existingIdx] = saved;
              else webhookEvents.push(saved);
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
          provide: getRepositoryToken(RefundEntity),
          useValue: {
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) => {
              if (where.id && refund.id !== where.id) return null;
              if (where.status && refund.status !== where.status) return null;
              if (where.paymentIntentId && refund.paymentIntentId !== where.paymentIntentId) {
                return null;
              }
              return refund;
            }),
          },
        },
        { provide: RefundService, useValue: refundService },
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
          provide: ZaloPaymentNotifyService,
          useValue: { notifyPaymentSuccess },
        },
        {
          provide: SmsPaymentNotifyService,
          useValue: {
            notifyPaymentSuccess: notifySmsSuccess,
          },
        },
        {
          provide: TenantWebhookService,
          useValue: { emitEvent: jest.fn().mockResolvedValue({ data: { delivered: 0, deliveries: [] } }) },
        },
        {
          provide: ReconciliationService,
          useValue: { reconcilePaymentEvent: jest.fn().mockResolvedValue({ matched: true, paymentIntentId: 'pi_test01' }) },
        },
      ],
    }).compile();

    service = module.get(PaymentWebhookService);
  });

  it('processes payment.success and writes balanced double-entry journal', async () => {
    const { payload, signature } = signedPayload();
    const result = await service.handle(payload, signature);

    expect(result.processed).toBe(true);
    expect(result.ledgerEntryId).toMatch(/^le_debit_/);
    expect(intent.status).toBe('SUCCEEDED');
    expect(booking.status).toBe('DEPOSITED');
    expect(journals).toHaveLength(1);
    expect(ledgerEntries).toHaveLength(2);
    expect(ledgerEntries.find((e) => e.side === 'DEBIT')?.amount).toBe('50000000');
    expect(ledgerEntries.find((e) => e.side === 'CREDIT')?.amount).toBe('50000000');
    expect(notifyPaymentSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        paymentIntentId: 'pi_test01',
        bookingId: 'bk_test01',
        amount: 50_000_000,
      }),
    );
    expect(result.znsDeliveryId).toBe('zns_pay01');
    expect(notifySmsSuccess).not.toHaveBeenCalled();
  });

  it('falls back to SMS when ZNS fails (OPS-S4-02)', async () => {
    notifyPaymentSuccess.mockResolvedValueOnce({ sent: false, skipped: true, skipReason: 'zns_failed' });
    notifySmsSuccess.mockResolvedValueOnce({
      sent: true,
      deliveryId: 'sms_pay01',
      status: 'SENT',
    });

    const { payload, signature } = signedPayload({ eventId: 'evt_sms_fallback' });
    const result = await service.handle(payload, signature);

    expect(notifySmsSuccess).toHaveBeenCalled();
    expect(result.smsDeliveryId).toBe('sms_pay01');
  });

  it('does not send ZNS on webhook idempotent replay', async () => {
    intent.status = 'SUCCEEDED';
    const { payload, signature } = signedPayload();
    await service.handle(payload, signature);

    expect(notifyPaymentSuccess).not.toHaveBeenCalled();
  });

  it('skips duplicate webhook by eventId (BR-21)', async () => {
    const { payload, signature } = signedPayload();
    const first = await service.handle(payload, signature);
    const second = await service.handle(payload, signature);

    expect(first.ledgerEntryId).toBeDefined();
    expect(second.idempotentReplay).toBe(true);
    expect(second.ledgerEntryId).toBe(first.ledgerEntryId);
    expect(journals).toHaveLength(1);
    expect(ledgerEntries).toHaveLength(2);
    expect(webhookEvents).toHaveLength(1);
  });

  it('rejects invalid HMAC signature', async () => {
    const { payload } = signedPayload();
    await expect(service.handle(payload, 'invalid-signature')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('processes payment.refunded webhook for async gateway (S4-05)', async () => {
    intent.status = 'SUCCEEDED';
    booking.status = 'DEPOSITED';
    refund.status = 'PENDING';

    const { payload, signature } = signedPayload({
      eventId: 'evt_refund_01',
      eventType: 'payment.refunded',
      transactionId: 'VNPAY_REFUND_TXN',
      refundId: 'rf_test01',
    });
    const result = await service.handle(payload, signature);

    expect(result.processed).toBe(true);
    expect(result.refundId).toBe('rf_test01');
    expect(result.ledgerEntryId).toBe('le_ref01');
    expect(refund.status).toBe('SUCCEEDED');
  });
});
