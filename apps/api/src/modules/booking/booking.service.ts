import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { InventoryLockService } from '../../infrastructure/redis/inventory-lock.service';
import { StreamEventsService } from '../stream/stream-events.service';
import type {
  CancelBookingInput,
  CancelBookingResult,
  CreateBookingInput,
  CreateBookingResult,
  BookingDetailResult,
  BookingEventsResult,
  BookingTimelineFilter,
  BookingTimelineResult,
  BookingReplayResult,
  ListBookingsResult,
} from './booking.types';
import { mapBookingEntity } from './booking.types';
import { RefundService } from '../payment/refund.service';
import { BookingEventsService } from './booking-events.service';
import { TenantWebhookService } from '../tenant-webhooks/tenant-webhook.service';
import { CrmService } from '../crm/crm.service';

const DEFAULT_EXPIRY_HOURS = 48;

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
    @InjectRepository(UnitEntity)
    private readonly units: Repository<UnitEntity>,
    private readonly inventoryLock: InventoryLockService,
    private readonly streamEvents: StreamEventsService,
    private readonly refunds: RefundService,
    private readonly bookingEvents: BookingEventsService,
    private readonly tenantWebhooks: TenantWebhookService,
    private readonly crm: CrmService,
  ) {}

  status() {
    return {
      module: 'booking',
      sprint: 'S3',
      ucs: ['UC-BK-01', 'UC-BK-03', 'UC-BK-05'],
      lock: 'redis',
      opWin: ['OP-WIN-01'],
    };
  }

  async getLockMetrics(tenantId: string) {
    return this.inventoryLock.getMetrics(tenantId);
  }

  async create(
    tenantId: string,
    input: CreateBookingInput,
    idempotencyKey?: string,
  ): Promise<CreateBookingResult> {
    if (idempotencyKey) {
      const replay = await this.bookings.findOne({
        where: { tenantId, idempotencyKey },
      });
      if (replay) {
        return { data: mapBookingEntity(replay), meta: { idempotentReplay: true } };
      }
    }

    if (!input.unitId?.trim()) {
      throw new UnprocessableEntityException({
        type: 'https://wereal.dev/problems/validation',
        title: 'Validation failed',
        detail: 'unitId is required',
      });
    }

    const unit = await this.units.findOne({
      where: { id: input.unitId, tenantId },
    });

    if (!unit) {
      throw new UnprocessableEntityException({
        type: 'https://wereal.dev/problems/validation',
        title: 'Validation failed',
        detail: `Unit ${input.unitId} not found or not available`,
      });
    }

    if (unit.status !== 'AVAILABLE') {
      const holder = await this.inventoryLock.getHolder(tenantId, input.unitId);
      const existing = holder
        ? await this.bookings.findOne({ where: { id: holder.bookingId, tenantId } })
        : null;
      throw new ConflictException({
        type: 'https://wereal.dev/problems/unit-unavailable',
        title: 'Unit no longer available',
        detail: 'Unit is already reserved by another booking',
        unitId: input.unitId,
        existingBookingId: existing?.id ?? holder?.bookingId,
        expiresAt: existing?.expiresAt.toISOString(),
      });
    }

    if (input.expectedUnitVersion === undefined || input.expectedUnitVersion === null) {
      throw new UnprocessableEntityException({
        type: 'https://wereal.dev/problems/validation',
        title: 'Validation failed',
        detail: 'expectedUnitVersion is required',
      });
    }

    if (unit.version !== input.expectedUnitVersion) {
      throw new ConflictException({
        type: 'https://wereal.dev/problems/version-conflict',
        title: 'Version conflict',
        detail: 'expectedUnitVersion does not match current unit version',
        expectedVersion: input.expectedUnitVersion,
        currentVersion: unit.version,
      });
    }

    const expiryHours = input.expiryHours ?? DEFAULT_EXPIRY_HOURS;
    const ttlSeconds = expiryHours * 60 * 60;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const id = `bk_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const lockId = `lock_${id}`;

    const lockToken = await this.inventoryLock.acquireLock(
      tenantId,
      input.unitId,
      id,
      ttlSeconds,
    );

    if (!lockToken) {
      const holder = await this.inventoryLock.getHolder(tenantId, input.unitId);
      const existing = holder
        ? await this.bookings.findOne({ where: { id: holder.bookingId, tenantId } })
        : null;
      throw new ConflictException({
        type: 'https://wereal.dev/problems/unit-unavailable',
        title: 'Unit no longer available',
        detail: 'Unit is already reserved by another booking',
        unitId: input.unitId,
        existingBookingId: existing?.id ?? holder?.bookingId,
        expiresAt: existing?.expiresAt.toISOString(),
      });
    }

    try {
      unit.status = 'RESERVED';
      await this.units.save(unit);

      const record = await this.bookings.save({
        id,
        tenantId,
        unitId: input.unitId,
        unitVersion: unit.version,
        leadId: input.leadId ?? null,
        status: 'RESERVED',
        lockId,
        lockToken,
        expiresAt,
        depositAmount:
          input.depositAmount !== undefined ? String(input.depositAmount) : null,
        notes: input.notes ?? null,
        idempotencyKey: idempotencyKey ?? null,
      });

      await this.streamEvents.publishUnitStatus(tenantId, {
        unitId: input.unitId,
        status: 'RESERVED',
        bookingId: id,
        leadId: input.leadId,
        timestamp: new Date().toISOString(),
      });

      await this.bookingEvents.append({
        tenantId,
        bookingId: id,
        eventType: 'BookingCreated',
        category: 'state',
        payload: {
          status: 'RESERVED',
          unitId: input.unitId,
          unitCode: unit.code,
          unitVersion: unit.version,
          leadId: input.leadId,
          expiresAt: expiresAt.toISOString(),
          depositAmount: input.depositAmount,
        },
      });
      await this.bookingEvents.append({
        tenantId,
        bookingId: id,
        eventType: 'InventoryLocked',
        category: 'system',
        payload: { lockId, unitId: input.unitId, ttlSeconds },
      });

      await this.tenantWebhooks
        .emitEvent(tenantId, 'booking.created', {
          bookingId: id,
          unitId: input.unitId,
          leadId: input.leadId ?? null,
          status: 'RESERVED',
          expiresAt: expiresAt.toISOString(),
        })
        .catch(() => undefined);

      if (input.leadId) {
        await this.crm.syncLeadFromBooking(tenantId, input.leadId, input.unitId).catch(() => undefined);
      }

      return { data: mapBookingEntity(record) };
    } catch (error) {
      await this.inventoryLock.releaseLock(tenantId, input.unitId, lockToken);
      throw error;
    }
  }

  /** BR-17 — release Redis lock and restore unit when booking expires */
  async expireBooking(booking: BookingEntity): Promise<void> {
    if (booking.status !== 'RESERVED') return;

    await this.inventoryLock.releaseLock(booking.tenantId, booking.unitId, booking.lockToken);

    booking.status = 'EXPIRED';
    await this.bookings.save(booking);

    const unit = await this.units.findOne({
      where: { id: booking.unitId, tenantId: booking.tenantId },
    });
    if (unit && unit.status === 'RESERVED') {
      unit.status = 'AVAILABLE';
      await this.units.save(unit);
      await this.streamEvents.publishUnitStatus(booking.tenantId, {
        unitId: booking.unitId,
        status: 'AVAILABLE',
        bookingId: booking.id,
        timestamp: new Date().toISOString(),
      });
    }

    await this.bookingEvents.append({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      eventType: 'BookingExpired',
      category: 'state',
      payload: { previousStatus: 'RESERVED', unitId: booking.unitId },
    });
  }

  /** API-057 DELETE /bookings/{id} — UC-BK-05 cancel + optional refund (S4-05) */
  async cancelBooking(
    tenantId: string,
    bookingId: string,
    input: CancelBookingInput,
    actorId?: string,
  ): Promise<CancelBookingResult> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${bookingId} not found` });
    }

    if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED' || booking.status === 'REFUNDED') {
      return { data: mapBookingEntity(booking) };
    }

    if (booking.status === 'DEPOSITED') {
      if (input.initiateRefund !== false) {
        const intent = await this.intents.findOne({
          where: { bookingId: booking.id, tenantId, status: 'SUCCEEDED' },
        });
        if (!intent) {
          throw new UnprocessableEntityException({
            detail: 'No succeeded payment intent found for refund',
          });
        }

        const refundResult = await this.refunds.createRefund(
          tenantId,
          {
            paymentIntentId: intent.id,
            reason: input.reason ?? 'Booking cancelled',
          },
          undefined,
          actorId,
        );

        const updated = await this.bookings.findOneOrFail({ where: { id: bookingId, tenantId } });
        await this.bookingEvents.append({
          tenantId,
          bookingId,
          eventType: 'BookingCancelled',
          category: 'state',
          actorId,
          payload: { reason: input.reason, initiateRefund: true },
        });
        await this.bookingEvents.append({
          tenantId,
          bookingId,
          eventType: 'RefundInitiated',
          category: 'payment',
          actorId,
          correlationId: refundResult.data.id,
          payload: {
            refundId: refundResult.data.id,
            paymentIntentId: refundResult.data.attributes.paymentIntentId,
          },
        });
        return { data: mapBookingEntity(updated), refund: refundResult.data };
      }
    }

    await this.inventoryLock.releaseLock(tenantId, booking.unitId, booking.lockToken);

    booking.status = 'CANCELLED';
    if (input.reason) {
      booking.notes = [booking.notes, `Cancel: ${input.reason}`].filter(Boolean).join('\n');
    }
    await this.bookings.save(booking);

    const unit = await this.units.findOne({ where: { id: booking.unitId, tenantId } });
    if (unit && unit.status === 'RESERVED') {
      unit.status = 'AVAILABLE';
      await this.units.save(unit);
      await this.streamEvents.publishUnitStatus(tenantId, {
        unitId: booking.unitId,
        status: 'AVAILABLE',
        bookingId: booking.id,
        timestamp: new Date().toISOString(),
      });
    }

    await this.bookingEvents.append({
      tenantId,
      bookingId,
      eventType: 'BookingCancelled',
      category: 'state',
      actorId,
      payload: { reason: input.reason, status: 'CANCELLED' },
    });

    return { data: mapBookingEntity(booking) };
  }

  /** API-053 GET /bookings — UC-BK-02 list / buyer deal tracker source */
  async listBookings(
    tenantId: string,
    filters: { leadId?: string; status?: BookingEntity['status']; limit?: number } = {},
  ): Promise<ListBookingsResult> {
    const limit = Math.min(filters.limit ?? 50, 100);
    const qb = this.bookings
      .createQueryBuilder('booking')
      .where('booking.tenant_id = :tenantId', { tenantId })
      .orderBy('booking.created_at', 'DESC')
      .take(limit);

    if (filters.leadId?.trim()) {
      qb.andWhere('booking.lead_id = :leadId', { leadId: filters.leadId.trim() });
    }
    if (filters.status) {
      qb.andWhere('booking.status = :status', { status: filters.status });
    }

    const rows = await qb.getMany();
    return {
      data: rows.map(mapBookingEntity),
      meta: { tenantId, count: rows.length, source: 'postgres' },
    };
  }

  async getById(tenantId: string, bookingId: string): Promise<BookingDetailResult> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${bookingId} not found` });
    }

    await this.bookingEvents.ensureBaselineEvents(booking);

    return {
      data: mapBookingEntity(booking),
      meta: {
        tenantId,
        allowedTransitions: allowedTransitionsFor(booking.status),
      },
    };
  }

  async getTimeline(
    tenantId: string,
    bookingId: string,
    filter: BookingTimelineFilter = 'all',
    limit?: number,
  ): Promise<BookingTimelineResult> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${bookingId} not found` });
    }

    await this.bookingEvents.ensureBaselineEvents(booking);
    const data = await this.bookingEvents.buildTimeline(tenantId, bookingId, {
      category: filter,
      limit,
    });

    return {
      data,
      meta: { bookingId, count: data.length, filter },
    };
  }

  async getDomainEvents(
    tenantId: string,
    bookingId: string,
    filter: BookingTimelineFilter = 'all',
    limit?: number,
  ): Promise<BookingEventsResult> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${bookingId} not found` });
    }

    await this.bookingEvents.ensureBaselineEvents(booking);
    const data = await this.bookingEvents.listDomainEvents(tenantId, bookingId, {
      category: filter,
      limit,
    });

    return {
      data,
      meta: { bookingId, count: data.length },
    };
  }

  async getReplay(tenantId: string, bookingId: string): Promise<BookingReplayResult> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${bookingId} not found` });
    }

    await this.bookingEvents.ensureBaselineEvents(booking);
    const pack = await this.bookingEvents.buildReplayPack(tenantId, bookingId, booking.status);

    return {
      data: {
        booking: mapBookingEntity(booking),
        timeline: pack.timeline,
        domainEvents: pack.domainEvents,
        reconstructedStates: pack.reconstructedStates,
        evidence: {
          auditQuery: `/audit/events?bookingId=${bookingId}`,
          auditExport: `/audit/events/export.csv?bookingId=${bookingId}`,
          domainExport: `/bookings/${bookingId}/replay/export.csv`,
          exportHint: 'Attach timeline + domain events for dispute mediation (UC-TR-03)',
        },
      },
      meta: {
        bookingId,
        uc: ['UC-BK-04', 'UC-TR-03'],
        screen: 'SCR-ADMIN-006',
      },
    };
  }

  /** OP-WIN-03 · UC-TR-01 — export domain events as CSV for replay pack */
  async exportReplayCsv(tenantId: string, bookingId: string): Promise<string> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) {
      throw new NotFoundException({ detail: `Booking ${bookingId} not found` });
    }

    await this.bookingEvents.ensureBaselineEvents(booking);
    const events = await this.bookingEvents.listDomainEvents(tenantId, bookingId, { limit: 200 });
    return this.bookingEvents.exportDomainEventsCsv(tenantId, bookingId, events);
  }
}

function allowedTransitionsFor(status: BookingEntity['status']): string[] {
  switch (status) {
    case 'RESERVED':
      return ['CANCEL', 'CREATE_PAYMENT'];
    case 'DEPOSITED':
      return ['CANCEL', 'CLOSE_DEAL'];
    case 'EXPIRED':
    case 'CANCELLED':
    case 'REFUNDED':
    default:
      return [];
  }
}
