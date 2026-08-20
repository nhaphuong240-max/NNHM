export interface UnitStatusEvent {
  unitId: string;
  status: string;
  timestamp: string;
  bookingId?: string;
  leadId?: string;
}

export interface StreamEnvelope {
  event: string;
  data: UnitStatusEvent | Record<string, unknown>;
}
