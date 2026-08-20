import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import type { PaymentMethod } from '../../database/entities/payment-intent.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { SmsPaymentNotifyService } from '../sms/sms-payment-notify.service';
import { SmsService } from '../sms/sms.service';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentCheckoutResult,
} from './payment.types';
import { mapPaymentIntent } from './payment.types';

const DEFAULT_TTL_MINUTES = 15;

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly audit: AuditService,
    private readonly streamEvents: StreamEventsService,
    private readonly smsPaymentNotify: SmsPaymentNotifyService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  status() {
    return {
      module: 'payment',
      sprint: 'S4',
      ucs: ['UC-PAY-01', 'UC-PAY-03', 'UC-PAY-04'],
      adapter: 'ADR-004',
      webhook: 'S4-02',
    };
  }

  async createIntent(
    tenantId: string,
    input: CreatePaymentIntentInput,
    idempotencyKey?: string,
    actorId?: string,
  ): Promise<CreatePaymentIntentResult> {
    if (idempotencyKey) {
      const replay = await this.intents.findOne({ where: { tenantId, idempotencyKey } });
      if (replay) {
        return { data: mapPaymentIntent(replay), meta: { idempotentReplay: true } };
      }
    }

    if (!input.bookingId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'bookingId is required' });
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new UnprocessableEntityException({ detail: 'amount must be a positive number' });
    }

    const booking = await this.bookings.findOne({
      where: { id: input.bookingId, tenantId },
    });

    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${input.bookingId} not found` });
    }

    if (booking.status !== 'RESERVED') {
      throw new UnprocessableEntityException({
        detail: `Booking ${input.bookingId} is not payable (status=${booking.status})`,
      });
    }

    const tenantRails = await this.rails.resolve(tenantId);
    const method: PaymentMethod = input.method ?? tenantRails.paymentMethod;

    const ttlMinutes = this.config.get<number>('PAYMENT_INTENT_TTL_MINUTES', DEFAULT_TTL_MINUTES);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const id = `pi_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const currency = input.currency ?? 'VND';

    let routed = await this.orchestrator.resolveRoute(tenantId, {
      method,
      amount: input.amount,
    });
    let gatewayMethod = routed.method;
    let routeDecision = routed.decision;
    let usedFallback = false;

    let gateway;
    try {
      gateway = await routed.adapter.createPaymentIntent({
        intentId: id,
        tenantId,
        bookingId: booking.id,
        amount: input.amount,
        currency,
        returnUrl: input.returnUrl,
        expiresAt,
      });
    } catch (primaryErr) {
      if (routeDecision?.fallback && routeDecision.fallback !== gatewayMethod) {
        routed = await this.orchestrator.resolveRoute(
          tenantId,
          { method, amount: input.amount },
          true,
        );
        gatewayMethod = routed.method;
        routeDecision = routed.decision;
        usedFallback = true;
        gateway = await routed.adapter.createPaymentIntent({
          intentId: id,
          tenantId,
          bookingId: booking.id,
          amount: input.amount,
          currency,
          returnUrl: input.returnUrl,
          expiresAt,
        });
      } else {
        throw primaryErr;
      }
    }

    const row = await this.intents.save({
      id,
      tenantId,
      bookingId: booking.id,
      amount: String(input.amount),
      currency,
      method: gatewayMethod,
      status: 'PENDING',
      paymentUrl: gateway.paymentUrl,
      gatewayRef: gateway.gatewayRef,
      idempotencyKey: idempotencyKey ?? null,
      expiresAt,
    });

    await this.audit.append({
      tenantId,
      entityType: 'payment_intent',
      entityId: id,
      action: 'CREATE',
      payload: {
        bookingId: booking.id,
        amount: input.amount,
        method: gatewayMethod,
        requestedMethod: method,
        gatewayRef: gateway.gatewayRef,
        routeRuleId: routeDecision?.ruleId ?? null,
        usedFallback,
      },
      actorId: actorId ?? null,
    });

    await this.streamEvents.publish(tenantId, {
      event: 'payment.intent.created',
      data: {
        paymentIntentId: id,
        bookingId: booking.id,
        unitId: booking.unitId,
        amount: input.amount,
        status: 'PENDING',
        timestamp: row.createdAt.toISOString(),
      },
    });

    await this.smsPaymentNotify.sendPaymentOtp({
      tenantId,
      paymentIntentId: id,
      bookingId: booking.id,
      amount: input.amount,
    });

    return { data: mapPaymentIntent(row) };
  }

  /** UC-PAY-01 — public buyer checkout summary (SCR-BUYER-004) */
  async getCheckout(tenantId: string, intentId: string): Promise<PaymentCheckoutResult> {
    const intent = await this.intents.findOne({ where: { id: intentId, tenantId } });
    if (!intent) {
      throw new NotFoundException({ detail: `PaymentIntent ${intentId} not found` });
    }

    const booking = await this.bookings.findOne({
      where: { id: intent.bookingId, tenantId },
    });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${intent.bookingId} not found` });
    }

    const unit = await this.units.findOne({ where: { id: booking.unitId, tenantId } });
    const rails = await this.rails.resolve(tenantId);
    const storedOtp = await this.sms.getPaymentOtp(tenantId, intentId);
    const sandboxOtp = rails.smsSandbox ? storedOtp : null;

    return {
      data: {
        id: intent.id,
        status: intent.status,
        amount: Number(intent.amount),
        currency: intent.currency,
        method: intent.method,
        paymentUrl: intent.status === 'PENDING' ? intent.paymentUrl : undefined,
        expiresAt: intent.expiresAt.toISOString(),
        booking: {
          id: booking.id,
          status: booking.status,
          unitId: booking.unitId,
          unitCode: unit?.code,
          expiresAt: booking.expiresAt.toISOString(),
          depositAmount: booking.depositAmount ? Number(booking.depositAmount) : undefined,
        },
      },
      meta: {
        tenantId,
        smsOtpSent: Boolean(storedOtp),
        sandboxOtp: sandboxOtp ?? undefined,
      },
    };
  }
}
