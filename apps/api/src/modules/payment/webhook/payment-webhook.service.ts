import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SEED_TENANT_ID } from '../../../database/database.seed.service';
import { BookingEntity } from '../../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../../database/entities/payment-intent.entity';
import { RefundEntity } from '../../../database/entities/refund.entity';
import { AuditService } from '../../audit/audit.service';
import { BookingEventsService } from '../../booking/booking-events.service';
import { LedgerWriteService } from '../../ledger/ledger-write.service';
import { ReconciliationService } from '../../ledger/reconciliation.service';
import { RefundService } from '../refund.service';
import { StreamEventsService } from '../../stream/stream-events.service';
import { ZaloPaymentNotifyService } from '../../zalo/zalo-payment-notify.service';
import { SmsPaymentNotifyService } from '../../sms/sms-payment-notify.service';
import { TenantWebhookService } from '../../tenant-webhooks/tenant-webhook.service';
import { configEnvReader } from '../../../infrastructure/config-env-reader';
import { webhookSkipVerifyAllowed } from '../../../infrastructure/security/production-security.service';
import { verifyWebhookSignature } from './webhook-signature.util';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import type { PaymentWebhookPayload, PaymentWebhookResult } from './webhook.types';

@Injectable()
export class PaymentWebhookService {
  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
    @InjectRepository(RefundEntity)
    private readonly refunds: Repository<RefundEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    private readonly idempotency: WebhookIdempotencyService,
    private readonly ledgerWrite: LedgerWriteService,
    private readonly audit: AuditService,
    private readonly streamEvents: StreamEventsService,
    private readonly refundService: RefundService,
    private readonly config: ConfigService,
    private readonly bookingEvents: BookingEventsService,
    private readonly zaloPaymentNotify: ZaloPaymentNotifyService,
    private readonly smsPaymentNotify: SmsPaymentNotifyService,
    private readonly tenantWebhooks: TenantWebhookService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  async handle(
    payload: PaymentWebhookPayload,
    signatureHeader?: string,
  ): Promise<PaymentWebhookResult> {
    this.verifySignature(payload, signatureHeader);

    if (!payload.eventId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'eventId is required' });
    }
    if (!payload.paymentIntentId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'paymentIntentId is required' });
    }

    const tenantId = payload.tenantId?.trim() || SEED_TENANT_ID;
    const claim = await this.idempotency.claim(
      tenantId,
      payload.eventId,
      payload as unknown as Record<string, unknown>,
      {
      eventType: payload.eventType,
      transactionId: payload.transactionId,
      paymentIntentId: payload.paymentIntentId,
    });

    if (claim.kind === 'duplicate') {
      return this.idempotency.resultFromRecord(claim.record);
    }

    const intent = await this.intents.findOne({
      where: { id: payload.paymentIntentId, tenantId },
    });
    if (!intent) {
      throw new NotFoundException({ detail: `PaymentIntent ${payload.paymentIntentId} not found` });
    }

    if (Number(intent.amount) !== payload.amount) {
      throw new UnprocessableEntityException({
        detail: 'Webhook amount does not match payment intent',
      });
    }

    let result: PaymentWebhookResult;

    if (payload.eventType === 'payment.success') {
      result = await this.processSuccess(tenantId, intent, payload);
    } else if (payload.eventType === 'payment.failed') {
      result = await this.processFailed(tenantId, intent, payload);
    } else if (payload.eventType === 'payment.refunded') {
      result = await this.processRefunded(tenantId, intent, payload);
    } else {
      throw new UnprocessableEntityException({ detail: `Unsupported eventType: ${payload.eventType}` });
    }

    await this.idempotency.complete(claim.record, result);
    return result;
  }

  private verifySignature(payload: PaymentWebhookPayload, signatureHeader?: string): void {
    const skip = webhookSkipVerifyAllowed(configEnvReader(this.config));
    if (skip) return;

    const secret = this.config.get<string>('WEBHOOK_HMAC_SECRET', 'wereal-dev-webhook-secret');
    const signature = signatureHeader ?? payload.signature;
    if (!verifyWebhookSignature(payload as unknown as Record<string, unknown>, signature, secret)) {
      throw new UnauthorizedException({ detail: 'Invalid webhook signature' });
    }
  }

  private async processSuccess(
    tenantId: string,
    intent: PaymentIntentEntity,
    payload: PaymentWebhookPayload,
  ): Promise<PaymentWebhookResult> {
    if (intent.status === 'SUCCEEDED') {
      const ledger = await this.ledgerWrite.writePaymentSuccess({
        tenantId,
        bookingId: intent.bookingId,
        paymentIntentId: intent.id,
        amount: payload.amount,
        transactionId: payload.transactionId,
        webhookEventId: payload.eventId,
        method: intent.method,
      });
      return {
        received: true,
        processed: true,
        idempotentReplay: true,
        ledgerEntryId: ledger.entryId,
        paymentIntentId: intent.id,
        bookingId: intent.bookingId,
      };
    }

    intent.status = 'SUCCEEDED';
    await this.intents.save(intent);

    const booking = await this.bookings.findOne({
      where: { id: intent.bookingId, tenantId },
    });
    if (booking && booking.status === 'RESERVED') {
      booking.status = 'DEPOSITED';
      await this.bookings.save(booking);

      await this.streamEvents.publishUnitStatus(tenantId, {
        unitId: booking.unitId,
        status: 'DEPOSITED',
        bookingId: booking.id,
        timestamp: new Date().toISOString(),
      });
    }

    const ledger = await this.ledgerWrite.writePaymentSuccess({
      tenantId,
      bookingId: intent.bookingId,
      paymentIntentId: intent.id,
      amount: payload.amount,
      transactionId: payload.transactionId,
      webhookEventId: payload.eventId,
      method: intent.method,
    });

    await this.audit.append({
      tenantId,
      entityType: 'payment_webhook',
      entityId: payload.eventId,
      action: 'PAYMENT_SUCCESS',
      payload: {
        transactionId: payload.transactionId,
        paymentIntentId: intent.id,
        bookingId: intent.bookingId,
        ledgerEntryId: ledger.entryId,
      },
    });

    await this.bookingEvents.append({
      tenantId,
      bookingId: intent.bookingId,
      eventType: 'PaymentSucceeded',
      category: 'payment',
      correlationId: payload.eventId,
      payload: {
        paymentIntentId: intent.id,
        amount: payload.amount,
        transactionId: payload.transactionId,
        journalId: ledger.journalId,
        ledgerEntryId: ledger.entryId,
        status: 'DEPOSITED',
      },
    });

    await this.streamEvents.publish(tenantId, {
      event: 'payment.success',
      data: {
        paymentIntentId: intent.id,
        bookingId: intent.bookingId,
        amount: payload.amount,
        transactionId: payload.transactionId,
        journalId: ledger.journalId,
        timestamp: new Date().toISOString(),
      },
    });

    const zns = await this.zaloPaymentNotify.notifyPaymentSuccess({
      tenantId,
      paymentIntentId: intent.id,
      bookingId: intent.bookingId,
      amount: payload.amount,
      transactionId: payload.transactionId,
      webhookEventId: payload.eventId,
    });

    // OPS-S4-02 — ZNS first; SMS fallback only when ZNS skipped/failed
    const sms = zns.sent
      ? { sent: false, skipped: true, skipReason: 'zns_delivered' }
      : await this.smsPaymentNotify.notifyPaymentSuccess({
          tenantId,
          paymentIntentId: intent.id,
          bookingId: intent.bookingId,
          amount: payload.amount,
          transactionId: payload.transactionId,
          webhookEventId: payload.eventId,
        });

    await this.tenantWebhooks
      .emitEvent(tenantId, 'payment.success', {
        paymentIntentId: intent.id,
        bookingId: intent.bookingId,
        amount: payload.amount,
        transactionId: payload.transactionId,
      })
      .catch(() => undefined);

    await this.tenantWebhooks
      .emitEvent(tenantId, 'booking.deposited', {
        bookingId: intent.bookingId,
        paymentIntentId: intent.id,
        amount: payload.amount,
        status: 'DEPOSITED',
      })
      .catch(() => undefined);

    await this.reconciliation.reconcilePaymentEvent(tenantId, intent.id);

    return {
      received: true,
      processed: true,
      ledgerEntryId: ledger.entryId,
      paymentIntentId: intent.id,
      bookingId: intent.bookingId,
      ...(zns.sent || zns.deliveryId
        ? {
            znsDeliveryId: zns.deliveryId,
            znsStatus: zns.status,
            znsIdempotentReplay: zns.idempotentReplay,
          }
        : {}),
      ...(sms.sent && 'deliveryId' in sms
        ? {
            smsDeliveryId: sms.deliveryId,
            smsStatus: sms.status,
            smsIdempotentReplay: sms.idempotentReplay,
          }
        : {}),
    };
  }

  private async processFailed(
    tenantId: string,
    intent: PaymentIntentEntity,
    payload: PaymentWebhookPayload,
  ): Promise<PaymentWebhookResult> {
    if (intent.status !== 'FAILED') {
      intent.status = 'FAILED';
      await this.intents.save(intent);
    }

    await this.audit.append({
      tenantId,
      entityType: 'payment_webhook',
      entityId: payload.eventId,
      action: 'PAYMENT_FAILED',
      payload: { transactionId: payload.transactionId, paymentIntentId: intent.id },
    });

    await this.bookingEvents.append({
      tenantId,
      bookingId: intent.bookingId,
      eventType: 'PaymentFailed',
      category: 'payment',
      correlationId: payload.eventId,
      payload: {
        paymentIntentId: intent.id,
        transactionId: payload.transactionId,
      },
    });

    return {
      received: true,
      processed: true,
      paymentIntentId: intent.id,
      bookingId: intent.bookingId,
    };
  }

  private async processRefunded(
    tenantId: string,
    intent: PaymentIntentEntity,
    payload: PaymentWebhookPayload,
  ): Promise<PaymentWebhookResult> {
    let refund: RefundEntity | null = null;

    if (payload.refundId?.trim()) {
      refund = await this.refunds.findOne({
        where: { id: payload.refundId, tenantId, paymentIntentId: intent.id },
      });
    } else {
      refund = await this.refunds.findOne({
        where: { tenantId, paymentIntentId: intent.id, status: 'PENDING' },
      });
    }

    if (!refund) {
      throw new NotFoundException({ detail: 'Refund record not found for webhook' });
    }

    if (Number(refund.amount) !== payload.amount) {
      throw new UnprocessableEntityException({
        detail: 'Webhook amount does not match refund',
      });
    }

    if (refund.status === 'SUCCEEDED' && refund.ledgerEntryId) {
      return {
        received: true,
        processed: true,
        idempotentReplay: true,
        refundId: refund.id,
        ledgerEntryId: refund.ledgerEntryId,
        paymentIntentId: intent.id,
        bookingId: intent.bookingId,
      };
    }

    const booking = await this.bookings.findOne({
      where: { id: intent.bookingId, tenantId },
    });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${intent.bookingId} not found` });
    }

    const completed = await this.refundService.completeRefund(refund, intent, booking);

    await this.audit.append({
      tenantId,
      entityType: 'payment_webhook',
      entityId: payload.eventId,
      action: 'PAYMENT_REFUNDED',
      payload: {
        transactionId: payload.transactionId,
        paymentIntentId: intent.id,
        refundId: completed.id,
        ledgerEntryId: completed.ledgerEntryId,
      },
    });

    await this.bookingEvents.append({
      tenantId,
      bookingId: intent.bookingId,
      eventType: 'RefundCompleted',
      category: 'payment',
      correlationId: completed.id,
      payload: {
        refundId: completed.id,
        paymentIntentId: intent.id,
        ledgerEntryId: completed.ledgerEntryId,
        amount: Number(completed.amount),
      },
    });

    return {
      received: true,
      processed: true,
      refundId: completed.id,
      ledgerEntryId: completed.ledgerEntryId ?? undefined,
      paymentIntentId: intent.id,
      bookingId: intent.bookingId,
    };
  }
}
