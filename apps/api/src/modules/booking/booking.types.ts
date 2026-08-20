export interface CreateBookingInput {
  unitId: string;
  /** Must match `unit.version` from GR at commit time (T7-S4). */
  expectedUnitVersion: number;
  leadId?: string;
  expiryHours?: number;
  depositAmount?: number;
  notes?: string;
}

export type BookingStatus = 'RESERVED' | 'DEPOSITED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface BookingAttributes {
  status: BookingStatus;
  unitId: string;
  unitVersion: number;
  leadId?: string;
  expiresAt: string;
  lockId: string;
  depositAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  attributes: BookingAttributes;
}

export interface CreateBookingResult {
  data: BookingRecord;
  meta?: { idempotentReplay?: boolean };
}

export interface CancelBookingInput {
  reason?: string;
  initiateRefund?: boolean;
}

import type { RefundRecord } from '../payment/refund.types';

export interface CancelBookingResult {
  data: BookingRecord;
  refund?: RefundRecord;
}

export type BookingTimelineFilter = 'all' | 'state' | 'payment' | 'system';

export interface BookingDomainEventRecord {
  eventId: string;
  type: string;
  category: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  actorId?: string;
  correlationId?: string;
}

export interface BookingTimelineEntry {
  timestamp: string;
  event: string;
  actor: string;
  description: string;
  category: string;
  correlationId?: string;
  payloadSummary?: string;
}

export interface BookingDetailResult {
  data: BookingRecord;
  meta: {
    tenantId: string;
    allowedTransitions: string[];
  };
}

export interface BookingEventsResult {
  data: BookingDomainEventRecord[];
  meta: { bookingId: string; count: number };
}

export interface BookingTimelineResult {
  data: BookingTimelineEntry[];
  meta: { bookingId: string; count: number; filter: BookingTimelineFilter };
}

export interface BookingReplayStateStep {
  at: string;
  eventType: string;
  category: string;
  inferredStatus: string;
}

export interface BookingReplayResult {
  data: {
    booking: BookingRecord;
    timeline: BookingTimelineEntry[];
    domainEvents: BookingDomainEventRecord[];
    reconstructedStates: BookingReplayStateStep[];
    evidence: {
      auditQuery: string;
      auditExport?: string;
      domainExport?: string;
      exportHint: string;
    };
  };
  meta: { bookingId: string; uc: string[]; screen: string };
}

export interface ListBookingsResult {
  data: BookingRecord[];
  meta: { tenantId: string; count: number; source: 'postgres' };
}

export function mapBookingEntity(row: {
  id: string;
  unitId: string;
  unitVersion: number;
  leadId: string | null;
  status: BookingStatus;
  lockId: string;
  expiresAt: Date;
  depositAmount: string | null;
  notes: string | null;
  createdAt: Date;
}): BookingRecord {
  return {
    id: row.id,
    attributes: {
      status: row.status,
      unitId: row.unitId,
      unitVersion: row.unitVersion,
      leadId: row.leadId ?? undefined,
      expiresAt: row.expiresAt.toISOString(),
      lockId: row.lockId,
      depositAmount: row.depositAmount ? Number(row.depositAmount) : undefined,
      notes: row.notes ?? undefined,
      createdAt: row.createdAt.toISOString(),
    },
  };
}
