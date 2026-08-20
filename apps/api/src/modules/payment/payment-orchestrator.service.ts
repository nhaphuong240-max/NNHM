import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { PaymentMethod } from '../../database/entities/payment-intent.entity';
import type { PaymentGatewayAdapter } from './adapters/payment-gateway.adapter';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { VnpayPaymentAdapter } from './adapters/vnpay-payment.adapter';
import { PaymentGatewayAdminService } from './payment-gateway-admin.service';
import {
  resolveGatewayRoute,
  type GatewayRouteDecision,
} from './payment-gateway-routing.util';

export type RoutedPaymentAdapter = {
  adapter: PaymentGatewayAdapter;
  method: PaymentMethod;
  decision: GatewayRouteDecision | null;
};

@Injectable()
export class PaymentOrchestratorService {
  constructor(
    private readonly vnpay: VnpayPaymentAdapter,
    private readonly mock: MockPaymentAdapter,
    private readonly gatewayAdmin: PaymentGatewayAdminService,
  ) {}

  /** Legacy direct route — prefer resolveRoute for UC-PAY-05 */
  route(method: PaymentMethod): PaymentGatewayAdapter {
    return this.adapterFor(method);
  }

  /** UC-PAY-05 — tenant routing rules + selected gateway */
  async resolveRoute(
    tenantId: string,
    input: { method: PaymentMethod; amount: number },
    primaryFailed = false,
  ): Promise<RoutedPaymentAdapter> {
    const rules = await this.gatewayAdmin.resolveRules(tenantId);
    const decision = resolveGatewayRoute(rules, input, primaryFailed);
    const method = decision?.selected ?? input.method;
    return {
      adapter: this.adapterFor(method),
      method,
      decision,
    };
  }

  private adapterFor(method: PaymentMethod): PaymentGatewayAdapter {
    if (method === 'MOCK') return this.mock;
    if (method === 'VNPAY') return this.vnpay;
    throw new UnprocessableEntityException({ detail: `Unsupported payment method: ${method}` });
  }
}
