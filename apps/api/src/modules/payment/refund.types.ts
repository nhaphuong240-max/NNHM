export interface CreateRefundInput {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundRecord {
  id: string;
  attributes: {
    status: string;
    bookingId: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
    gatewayRef?: string;
    reason?: string;
    ledgerEntryId?: string;
    createdAt: string;
  };
}

export interface CreateRefundResult {
  data: RefundRecord;
  meta?: { idempotentReplay?: boolean };
}

export function mapRefundEntity(row: {
  id: string;
  bookingId: string;
  paymentIntentId: string;
  amount: string;
  currency: string;
  status: string;
  gatewayRef: string | null;
  reason: string | null;
  ledgerEntryId: string | null;
  createdAt: Date;
}): RefundRecord {
  return {
    id: row.id,
    attributes: {
      status: row.status,
      bookingId: row.bookingId,
      paymentIntentId: row.paymentIntentId,
      amount: Number(row.amount),
      currency: row.currency,
      gatewayRef: row.gatewayRef ?? undefined,
      reason: row.reason ?? undefined,
      ledgerEntryId: row.ledgerEntryId ?? undefined,
      createdAt: row.createdAt.toISOString(),
    },
  };
}
