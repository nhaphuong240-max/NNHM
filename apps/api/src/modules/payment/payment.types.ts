import type { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';

export interface CreatePaymentIntentInput {
  bookingId: string;
  amount: number;
  currency?: string;
  method?: 'VNPAY' | 'MOCK';
  returnUrl?: string;
}

export interface PaymentIntentRecord {
  id: string;
  attributes: {
    status: string;
    bookingId: string;
    amount: number;
    currency: string;
    method: string;
    paymentUrl: string;
    gatewayRef?: string;
    expiresAt: string;
    createdAt: string;
  };
}

export interface CreatePaymentIntentResult {
  data: PaymentIntentRecord;
  meta?: { idempotentReplay?: boolean };
}

export interface PaymentCheckoutResult {
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    method: string;
    paymentUrl?: string;
    expiresAt: string;
    booking: {
      id: string;
      status: string;
      unitId: string;
      unitCode?: string;
      expiresAt: string;
      depositAmount?: number;
    };
  };
  meta: {
    tenantId: string;
    smsOtpSent?: boolean;
    sandboxOtp?: string;
  };
}

export function mapPaymentIntent(row: PaymentIntentEntity): PaymentIntentRecord {
  return {
    id: row.id,
    attributes: {
      status: row.status,
      bookingId: row.bookingId,
      amount: Number(row.amount),
      currency: row.currency,
      method: row.method,
      paymentUrl: row.paymentUrl,
      gatewayRef: row.gatewayRef ?? undefined,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    },
  };
}
