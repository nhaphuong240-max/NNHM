import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RailResolverService } from '../../tenant-config/rail-resolver.service';
import { VnpayPaymentAdapter } from './vnpay-payment.adapter';

describe('VnpayPaymentAdapter', () => {
  const params = {
    intentId: 'pi_abc12345',
    tenantId: 'ten_pilot_cdt_01',
    bookingId: 'bk_01',
    amount: 50_000_000,
    currency: 'VND',
    expiresAt: new Date('2026-09-08T10:00:00+07:00'),
  };

  it('uses tenant vnpaySandbox overlay for sandbox URL', async () => {
    const adapter = new VnpayPaymentAdapter(
      {
        get: jest.fn((_key: string, fallback?: unknown) => fallback),
      } as unknown as ConfigService,
      {
        resolve: jest.fn().mockResolvedValue({ vnpaySandbox: true }),
      } as unknown as RailResolverService,
    );

    const result = await adapter.createPaymentIntent(params);
    expect(result.paymentUrl).toContain('sandbox.vnpayment.vn');
    expect(result.gatewayRef).toBe('abc12345');
  });

  it('rejects live mode when URL still points at sandbox', async () => {
    const adapter = new VnpayPaymentAdapter(
      {
        get: jest.fn((key: string, fallback?: unknown) => {
          if (key === 'VNPAY_PAYMENT_URL') return 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
          return fallback;
        }),
      } as unknown as ConfigService,
      {
        resolve: jest.fn().mockResolvedValue({ vnpaySandbox: false }),
      } as unknown as RailResolverService,
    );

    await expect(adapter.createPaymentIntent(params)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
