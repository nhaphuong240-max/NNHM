import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { RailResolverService } from '../../tenant-config/rail-resolver.service';
import type {
  CreatePaymentIntentParams,
  PaymentGatewayAdapter,
  PaymentIntentAdapterResult,
  RefundAdapterResult,
  RefundParams,
} from './payment-gateway.adapter';

/** ADR-004 — VNPay sandbox redirect (no SDK, signed query stub) */
@Injectable()
export class VnpayPaymentAdapter implements PaymentGatewayAdapter {
  readonly code = 'VNPAY';

  constructor(
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentAdapterResult> {
    const liveRails = await this.rails.resolve(params.tenantId);
    const sandbox = liveRails.vnpaySandbox;
    const tmnCode = this.config.get<string>('VNPAY_TMN_CODE', 'WEREALDEV');
    const secret = this.config.get<string>('VNPAY_HASH_SECRET', 'wereal-dev-vnpay-secret');
    const defaultUrl = sandbox
      ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
      : 'https://vnpayment.vn/paymentv2/vpcpay.html';
    const baseUrl = this.config.get<string>('VNPAY_PAYMENT_URL', defaultUrl);

    if (!sandbox && baseUrl.includes('sandbox.vnpayment.vn')) {
      throw new UnprocessableEntityException({
        detail: 'VNPAY_SANDBOX=false but VNPAY_PAYMENT_URL points to sandbox',
      });
    }

    const gatewayRef = params.intentId.replace(/^pi_/, '');
    const query = new URLSearchParams({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(params.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: gatewayRef,
      vnp_OrderInfo: `Booking ${params.bookingId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: params.returnUrl ?? 'http://localhost:5174/payment/result',
      vnp_CreateDate: this.formatVnpDate(new Date()),
      vnp_ExpireDate: this.formatVnpDate(params.expiresAt),
    });

    const signData = [...query.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const secureHash = createHmac('sha512', secret).update(signData).digest('hex');
    query.set('vnp_SecureHash', secureHash);

    return {
      paymentUrl: `${baseUrl}?${query.toString()}`,
      gatewayRef,
    };
  }

  async refund(params: RefundParams): Promise<RefundAdapterResult> {
    return {
      status: 'PENDING',
      gatewayRef: `VNPAY_REFUND_${params.refundId}`,
    };
  }

  private formatVnpDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
      `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
  }
}
