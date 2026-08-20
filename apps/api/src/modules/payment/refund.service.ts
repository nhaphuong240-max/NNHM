import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { RefundEntity } from '../../database/entities/refund.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { InventoryLockService } from '../../infrastructure/redis/inventory-lock.service';
import { AuditService } from '../audit/audit.service';
import { BookingEventsService } from '../booking/booking-events.service';
import { LedgerWriteService } from '../ledger/ledger-write.service';
import { StreamEventsService } from '../stream/stream-events.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import type { CreateRefundInput, CreateRefundResult } from './refund.types';
import { mapRefundEntity } from './refund.types';

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(RefundEntity)
    private readonly refunds: Repository<RefundEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly ledgerWrite: LedgerWriteService,
    private readonly inventoryLock: InventoryLockService,
    private readonly audit: AuditService,
    private readonly streamEvents: StreamEventsService,
    private readonly bookingEvents: BookingEventsService,
  ) {}

  async createRefund(
    tenantId: string,
    input: CreateRefundInput,
    idempotencyKey?: string,
    actorId?: string,
  ): Promise<CreateRefundResult> {
    if (idempotencyKey) {
      const replay = await this.refunds.findOne({ where: { tenantId, idempotencyKey } });
      if (replay) {
        return { data: mapRefundEntity(replay), meta: { idempotentReplay: true } };
      }
    }

    if (!input.paymentIntentId?.trim()) {
      throw new UnprocessableEntityException({ detail: 'paymentIntentId is required' });
    }

    const intent = await this.intents.findOne({
      where: { id: input.paymentIntentId, tenantId },
    });
    if (!intent) {
      throw new NotFoundException({ detail: `PaymentIntent ${input.paymentIntentId} not found` });
    }

    if (intent.status !== 'SUCCEEDED') {
      throw new UnprocessableEntityException({
        detail: `PaymentIntent ${intent.id} is not refundable (status=${intent.status})`,
      });
    }

    const booking = await this.bookings.findOne({
      where: { id: intent.bookingId, tenantId },
    });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${intent.bookingId} not found` });
    }

    if (booking.status !== 'DEPOSITED') {
      throw new UnprocessableEntityException({
        detail: `Booking ${booking.id} is not refundable (status=${booking.status})`,
      });
    }

    const amount = input.amount ?? Number(intent.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(intent.amount)) {
      throw new UnprocessableEntityException({ detail: 'Invalid refund amount' });
    }

    const existingRefund = await this.refunds.findOne({
      where: { tenantId, paymentIntentId: intent.id, status: 'SUCCEEDED' },
    });
    if (existingRefund) {
      return { data: mapRefundEntity(existingRefund), meta: { idempotentReplay: true } };
    }

    const refundId = `rf_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const adapter = this.orchestrator.route(intent.method);
    const gateway = await adapter.refund({
      refundId,
      paymentIntentId: intent.id,
      amount,
      gatewayRef: intent.gatewayRef,
      reason: input.reason,
    });

    let refund: RefundEntity = await this.refunds.save({
      id: refundId,
      tenantId,
      bookingId: booking.id,
      paymentIntentId: intent.id,
      amount: String(amount),
      currency: intent.currency,
      status: gateway.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'PENDING',
      gatewayRef: gateway.gatewayRef,
      reason: input.reason ?? null,
      idempotencyKey: idempotencyKey ?? null,
    });

    if (gateway.status === 'SUCCEEDED') {
      refund = await this.completeRefund(refund, intent, booking, actorId);
    }

    return { data: mapRefundEntity(refund) };
  }

  /** Complete refund after gateway confirmation (sync MOCK or webhook payment.refunded) */
  async completeRefund(
    refund: RefundEntity,
    intent?: PaymentIntentEntity,
    booking?: BookingEntity,
    actorId?: string,
  ): Promise<RefundEntity> {
    if (refund.status === 'SUCCEEDED' && refund.ledgerEntryId) {
      return refund;
    }

    const paymentIntent =
      intent ??
      (await this.intents.findOne({ where: { id: refund.paymentIntentId, tenantId: refund.tenantId } }));
    if (!paymentIntent) {
      throw new NotFoundException({ detail: `PaymentIntent ${refund.paymentIntentId} not found` });
    }

    const bookingRow =
      booking ??
      (await this.bookings.findOne({ where: { id: refund.bookingId, tenantId: refund.tenantId } }));
    if (!bookingRow) {
      throw new NotFoundException({ detail: `Booking ${refund.bookingId} not found` });
    }

    const ledger = await this.ledgerWrite.writePaymentRefund({
      tenantId: refund.tenantId,
      bookingId: refund.bookingId,
      paymentIntentId: refund.paymentIntentId,
      refundId: refund.id,
      amount: Number(refund.amount),
      transactionId: refund.gatewayRef ?? `REFUND_${refund.id}`,
      method: paymentIntent.method,
    });

    await this.inventoryLock.releaseLock(
      refund.tenantId,
      bookingRow.unitId,
      bookingRow.lockToken,
    );

    paymentIntent.status = 'REFUNDED';
    bookingRow.status = 'REFUNDED';
    await this.intents.save(paymentIntent);
    await this.bookings.save(bookingRow);

    const unit = await this.units.findOne({
      where: { id: bookingRow.unitId, tenantId: refund.tenantId },
    });
    if (unit) {
      unit.status = 'AVAILABLE';
      await this.units.save(unit);
      await this.streamEvents.publishUnitStatus(refund.tenantId, {
        unitId: unit.id,
        status: 'AVAILABLE',
        bookingId: bookingRow.id,
        timestamp: new Date().toISOString(),
      });
    }

    refund.status = 'SUCCEEDED';
    refund.ledgerEntryId = ledger.entryId;
    const saved = await this.refunds.save(refund);

    await this.audit.append({
      tenantId: refund.tenantId,
      entityType: 'refund',
      entityId: refund.id,
      action: 'REFUND_SUCCEEDED',
      payload: {
        bookingId: refund.bookingId,
        paymentIntentId: refund.paymentIntentId,
        amount: Number(refund.amount),
        ledgerEntryId: ledger.entryId,
        journalId: ledger.journalId,
      },
      actorId: actorId ?? null,
    });

    await this.streamEvents.publish(refund.tenantId, {
      event: 'payment.refunded',
      data: {
        refundId: refund.id,
        bookingId: refund.bookingId,
        paymentIntentId: refund.paymentIntentId,
        amount: Number(refund.amount),
        timestamp: new Date().toISOString(),
      },
    });

    await this.bookingEvents.append({
      tenantId: refund.tenantId,
      bookingId: refund.bookingId,
      eventType: 'RefundCompleted',
      category: 'payment',
      actorId: actorId ?? null,
      correlationId: refund.id,
      payload: {
        refundId: refund.id,
        paymentIntentId: refund.paymentIntentId,
        ledgerEntryId: ledger.entryId,
        journalId: ledger.journalId,
        amount: Number(refund.amount),
      },
    });

    return saved;
  }

  async findByPaymentIntent(tenantId: string, paymentIntentId: string): Promise<RefundEntity | null> {
    const rows = await this.refunds.find({
      where: { tenantId, paymentIntentId },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return rows[0] ?? null;
  }

  async list(tenantId: string, limit = 50) {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.refunds.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take,
    });
    return {
      data: rows.map(mapRefundEntity),
      meta: { tenantId, count: rows.length },
    };
  }
}
