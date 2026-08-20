import type { Booking } from '../types/booking';

type ApiBookingRow = {
  id: string;
  attributes: {
    status: 'RESERVED';
    unitId: string;
    leadId?: string;
    expiresAt: string;
    lockId: string;
    depositAmount?: number;
    notes?: string;
    createdAt: string;
  };
};

export function mapApiBooking(raw: ApiBookingRow): Booking {
  return {
    id: raw.id,
    status: raw.attributes.status,
    unitId: raw.attributes.unitId,
    leadId: raw.attributes.leadId,
    expiresAt: raw.attributes.expiresAt,
    lockId: raw.attributes.lockId,
    depositAmount: raw.attributes.depositAmount,
    notes: raw.attributes.notes,
    createdAt: raw.attributes.createdAt,
  };
}

export type { ApiBookingRow };
