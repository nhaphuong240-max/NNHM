export interface CreatePaymentIntentParams {
  intentId: string;
  tenantId: string;
  bookingId: string;
  amount: number;
  currency: string;
  returnUrl?: string;
  expiresAt: Date;
}

export interface PaymentIntentAdapterResult {
  paymentUrl: string;
  gatewayRef: string;
}

export interface RefundParams {
  refundId: string;
  paymentIntentId: string;
  amount: number;
  gatewayRef?: string | null;
  reason?: string;
}

export interface RefundAdapterResult {
  status: 'SUCCEEDED' | 'PENDING';
  gatewayRef: string;
}

export interface PaymentGatewayAdapter {
  readonly code: string;
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentAdapterResult>;
  refund(params: RefundParams): Promise<RefundAdapterResult>;
}
