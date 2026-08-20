import { Injectable } from '@nestjs/common';
import type {
  CreatePaymentIntentParams,
  PaymentGatewayAdapter,
  PaymentIntentAdapterResult,
  RefundAdapterResult,
  RefundParams,
} from './payment-gateway.adapter';

/** ADR-004 — deterministic sandbox URL for CI/dev */
@Injectable()
export class MockPaymentAdapter implements PaymentGatewayAdapter {
  readonly code = 'MOCK';

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentAdapterResult> {
    const gatewayRef = `MOCK_${params.intentId}`;
    const paymentUrl =
      `${params.returnUrl ?? 'http://localhost:3000/api/v1/payments/mock/complete'}` +
      `?intentId=${params.intentId}&ref=${gatewayRef}&amount=${params.amount}`;

    return { paymentUrl, gatewayRef };
  }

  async refund(params: RefundParams): Promise<RefundAdapterResult> {
    return {
      status: 'SUCCEEDED',
      gatewayRef: `MOCK_REFUND_${params.refundId}`,
    };
  }
}
