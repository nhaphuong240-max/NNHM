import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookingDomainEventEntity } from '../../database/entities/booking-domain-event.entity';
import type { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import type {
  BookingDomainEventRecord,
  BookingTimelineEntry,
  BookingTimelineFilter,
} from './booking.types';

const TIMELINE_LABELS: Record<string, string> = {
  BookingCreated: 'Giữ chỗ thành công',
  InventoryLocked: 'Khóa tồn kho (Redis lock)',
  BookingExpired: 'Hết hạn giữ chỗ — lock được giải phóng',
  BookingCancelled: 'Hủy booking',
  PaymentSucceeded: 'Thanh toán cọc thành công',
  PaymentFailed: 'Thanh toán thất bại',
  RefundInitiated: 'Khởi tạo hoàn tiền',
  RefundCompleted: 'Hoàn tiền thành công',
  CommissionDealClosed: 'Chốt deal — snapshot hoa hồng',
};

@Injectable()
export class BookingEventsService {
  constructor(
    @InjectRepository(BookingDomainEventEntity)
    private readonly events: Repository<BookingDomainEventEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly intents: Repository<PaymentIntentEntity>,
  ) {}

  async append(input: {
    tenantId: string;
    bookingId: string;
    eventType: string;
    category: BookingDomainEventEntity['category'];
    payload?: Record<string, unknown> | null;
    actorId?: string | null;
    correlationId?: string | null;
  }): Promise<BookingDomainEventEntity> {
    return this.events.save({
      id: `evt_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      tenantId: input.tenantId,
      bookingId: input.bookingId,
      eventType: input.eventType,
      category: input.category,
      payload: input.payload ?? null,
      actorId: input.actorId ?? null,
      correlationId: input.correlationId ?? null,
    });
  }

  async listDomainEvents(
    tenantId: string,
    bookingId: string,
    options?: { category?: BookingTimelineFilter; limit?: number },
  ): Promise<BookingDomainEventRecord[]> {
    const limit = Math.min(options?.limit ?? 100, 200);
    const qb = this.events
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.booking_id = :bookingId', { bookingId })
      .orderBy('e.occurred_at', 'ASC')
      .take(limit);

    if (options?.category && options.category !== 'all') {
      qb.andWhere('e.category = :category', { category: options.category });
    }

    const rows = await qb.getMany();
    return rows.map(mapDomainEvent);
  }

  async buildTimeline(
    tenantId: string,
    bookingId: string,
    options?: { category?: BookingTimelineFilter; limit?: number },
  ): Promise<BookingTimelineEntry[]> {
    const domainEvents = await this.listDomainEvents(tenantId, bookingId, options);
    return domainEvents.map((event) => ({
      timestamp: event.occurredAt,
      event: event.type,
      actor: event.actorId ?? 'system',
      description: this.describeEvent(event),
      category: event.category,
      correlationId: event.correlationId,
      payloadSummary: summarizePayload(event.type, event.payload),
    }));
  }

  /** UC-BK-04 · SCR-ADMIN-006 — reconstruct booking state from domain events */
  async buildReplayPack(
    tenantId: string,
    bookingId: string,
    bookingStatus: string,
  ): Promise<{
    domainEvents: BookingDomainEventRecord[];
    timeline: BookingTimelineEntry[];
    reconstructedStates: {
      at: string;
      eventType: string;
      category: string;
      inferredStatus: string;
    }[];
  }> {
    const domainEvents = await this.listDomainEvents(tenantId, bookingId, { limit: 200 });
    const timeline = await this.buildTimeline(tenantId, bookingId, { limit: 200 });
    let inferredStatus = 'RESERVED';
    const reconstructedStates = domainEvents.map((event) => {
      inferredStatus = inferStatusFromEvent(event.type, inferredStatus);
      return {
        at: event.occurredAt,
        eventType: event.type,
        category: event.category,
        inferredStatus,
      };
    });

    if (reconstructedStates.length === 0) {
      reconstructedStates.push({
        at: new Date(0).toISOString(),
        eventType: 'Snapshot',
        category: 'state',
        inferredStatus: bookingStatus,
      });
    }

    return { domainEvents, timeline, reconstructedStates };
  }

  /** UC-BK-04 · OP-WIN-03 — domain event CSV for dispute replay */
  exportDomainEventsCsv(
    tenantId: string,
    bookingId: string,
    events: BookingDomainEventRecord[],
  ): string {
    const header = [
      'event_id',
      'booking_id',
      'event_type',
      'category',
      'occurred_at',
      'actor_id',
      'correlation_id',
      'payload_json',
    ].join(',');

    const lines = events.map((event) =>
      [
        event.eventId,
        bookingId,
        event.type,
        event.category,
        event.occurredAt,
        event.actorId ?? '',
        event.correlationId ?? '',
        JSON.stringify(event.payload ?? {}),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [header, ...lines].join('\n');
  }

  /** Bootstrap timeline for bookings created before event store (dev seed). */
  async ensureBaselineEvents(booking: BookingEntity): Promise<void> {
    const count = await this.events.count({
      where: { tenantId: booking.tenantId, bookingId: booking.id },
    });
    if (count > 0) return;

    await this.append({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      eventType: 'BookingCreated',
      category: 'state',
      payload: {
        status: 'RESERVED',
        unitId: booking.unitId,
        leadId: booking.leadId,
        expiresAt: booking.expiresAt.toISOString(),
        depositAmount: booking.depositAmount ? Number(booking.depositAmount) : undefined,
      },
    });

    await this.append({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      eventType: 'InventoryLocked',
      category: 'system',
      payload: { lockId: booking.lockId, unitId: booking.unitId },
    });

    const intents = await this.intents.find({
      where: { tenantId: booking.tenantId, bookingId: booking.id },
      order: { createdAt: 'ASC' },
    });

    for (const intent of intents) {
      if (intent.status === 'SUCCEEDED') {
        await this.append({
          tenantId: booking.tenantId,
          bookingId: booking.id,
          eventType: 'PaymentSucceeded',
          category: 'payment',
          correlationId: intent.id,
          payload: {
            paymentIntentId: intent.id,
            amount: Number(intent.amount),
            method: intent.method,
          },
        });
      } else if (intent.status === 'FAILED') {
        await this.append({
          tenantId: booking.tenantId,
          bookingId: booking.id,
          eventType: 'PaymentFailed',
          category: 'payment',
          correlationId: intent.id,
          payload: { paymentIntentId: intent.id, amount: Number(intent.amount) },
        });
      }
    }

    if (booking.status === 'EXPIRED') {
      await this.append({
        tenantId: booking.tenantId,
        bookingId: booking.id,
        eventType: 'BookingExpired',
        category: 'state',
        payload: { previousStatus: 'RESERVED' },
      });
    } else if (booking.status === 'CANCELLED') {
      await this.append({
        tenantId: booking.tenantId,
        bookingId: booking.id,
        eventType: 'BookingCancelled',
        category: 'state',
        payload: { reason: booking.notes },
      });
    } else if (booking.status === 'REFUNDED') {
      await this.append({
        tenantId: booking.tenantId,
        bookingId: booking.id,
        eventType: 'RefundCompleted',
        category: 'payment',
        payload: { status: 'REFUNDED' },
      });
    }
  }

  private describeEvent(event: BookingDomainEventRecord): string {
    const label = TIMELINE_LABELS[event.type] ?? event.type;
    const unitCode = event.payload?.unitCode as string | undefined;
    if (event.type === 'BookingCreated' && unitCode) {
      return `${label} — căn ${unitCode}`;
    }
    if (event.type === 'PaymentSucceeded' && event.payload?.amount) {
      return `${label} — ${Number(event.payload.amount).toLocaleString('vi-VN')} VND`;
    }
    if (event.type === 'BookingCancelled' && event.payload?.reason) {
      return `${label}: ${event.payload.reason}`;
    }
    return label;
  }
}

function mapDomainEvent(row: BookingDomainEventEntity): BookingDomainEventRecord {
  return {
    eventId: row.id,
    type: row.eventType,
    category: row.category,
    payload: row.payload ?? {},
    occurredAt: row.occurredAt.toISOString(),
    actorId: row.actorId ?? undefined,
    correlationId: row.correlationId ?? undefined,
  };
}

function summarizePayload(
  type: string,
  payload: Record<string, unknown>,
): string | undefined {
  if (type === 'PaymentSucceeded' && payload.ledgerEntryId) {
    return `Ledger ${payload.ledgerEntryId}`;
  }
  if (type === 'PaymentSucceeded' && payload.journalId) {
    return `Journal ${payload.journalId}`;
  }
  if (payload.paymentIntentId) {
    return `PI ${payload.paymentIntentId}`;
  }
  return undefined;
}

function inferStatusFromEvent(eventType: string, current: string): string {
  switch (eventType) {
    case 'BookingCreated':
    case 'InventoryLocked':
      return 'RESERVED';
    case 'PaymentSucceeded':
      return 'DEPOSITED';
    case 'BookingExpired':
      return 'EXPIRED';
    case 'BookingCancelled':
      return 'CANCELLED';
    case 'RefundCompleted':
    case 'RefundInitiated':
      return 'REFUNDED';
    default:
      return current;
  }
}
