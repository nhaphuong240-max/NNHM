import { Test, TestingModule } from '@nestjs/testing';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { VnpayPaymentAdapter } from './adapters/vnpay-payment.adapter';
import { PaymentGatewayAdminService } from './payment-gateway-admin.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

describe('PaymentOrchestratorService', () => {
  let service: PaymentOrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentOrchestratorService,
        { provide: MockPaymentAdapter, useValue: { code: 'MOCK' } },
        { provide: VnpayPaymentAdapter, useValue: { code: 'VNPAY' } },
        {
          provide: PaymentGatewayAdminService,
          useValue: {
            resolveRules: jest.fn().mockResolvedValue([
              {
                id: 'rule_high_value',
                label: 'High-value deposit → VNPay primary',
                priority: 30,
                match: { minAmount: 100_000_000 },
                primary: 'VNPAY',
                fallback: 'MOCK',
                enabled: true,
              },
              {
                id: 'rule_mock_dev',
                label: 'Dev MOCK default',
                priority: 10,
                match: { method: 'MOCK' },
                primary: 'MOCK',
                fallback: null,
                enabled: true,
              },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentOrchestratorService);
  });

  it('resolves high-value route to VNPAY via admin rules', async () => {
    const routed = await service.resolveRoute('ten_dev_01', {
      method: 'MOCK',
      amount: 150_000_000,
    });
    expect(routed.method).toBe('VNPAY');
    expect(routed.decision?.ruleId).toBe('rule_high_value');
  });

  it('falls back when primaryFailed=true', async () => {
    const routed = await service.resolveRoute(
      'ten_dev_01',
      { method: 'VNPAY', amount: 150_000_000 },
      true,
    );
    expect(routed.method).toBe('MOCK');
    expect(routed.decision?.usedFallback).toBe(true);
  });
});
