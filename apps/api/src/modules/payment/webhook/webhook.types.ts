export type PaymentWebhookEventType = 'payment.success' | 'payment.failed' | 'payment.refunded';

export interface PaymentWebhookPayload {
  eventId: string;
  eventType: PaymentWebhookEventType;
  transactionId: string;
  amount: number;
  paymentIntentId: string;
  refundId?: string;
  tenantId?: string;
  timestamp?: string;
  signature?: string;
}

export interface PaymentWebhookResult {
  received: boolean;
  processed: boolean;
  idempotentReplay?: boolean;
  ledgerEntryId?: string;
  refundId?: string;
  paymentIntentId?: string;
  bookingId?: string;
  znsDeliveryId?: string;
  znsStatus?: string;
  znsIdempotentReplay?: boolean;
  smsDeliveryId?: string;
  smsStatus?: string;
  smsIdempotentReplay?: boolean;
}
