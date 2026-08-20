export interface QuickBookingInput {
  unitId: string;
  expectedUnitVersion: number;
  leadId: string;
  expiryHours: number;
  depositAmount: number;
  notes?: string;
}

export interface AvailableUnit {
  id: string;
  code: string;
  version: number;
  basePrice: number;
  area: number;
  bedrooms: number;
  status: string;
}

export interface Booking {
  id: string;
  status: 'RESERVED';
  unitId: string;
  leadId?: string;
  expiresAt: string;
  lockId: string;
  depositAmount?: number;
  notes?: string;
  createdAt: string;
}

export class BookingConflictError extends Error {
  readonly existingBookingId?: string;
  readonly expiresAt?: string;

  constructor(message: string, details?: { existingBookingId?: string; expiresAt?: string }) {
    super(message);
    this.name = 'BookingConflictError';
    this.existingBookingId = details?.existingBookingId;
    this.expiresAt = details?.expiresAt;
  }
}
