import {
  DEFAULT_GATEWAY_RULES,
  resolveGatewayRoute,
} from './payment-gateway-routing.util';

describe('payment-gateway-routing.util', () => {
  it('routes MOCK method to mock gateway', () => {
    const decision = resolveGatewayRoute(DEFAULT_GATEWAY_RULES, {
      method: 'MOCK',
      amount: 50_000_000,
    });
    expect(decision?.selected).toBe('MOCK');
    expect(decision?.usedFallback).toBe(false);
  });

  it('falls back when primary fails', () => {
    const decision = resolveGatewayRoute(
      DEFAULT_GATEWAY_RULES,
      { method: 'VNPAY', amount: 50_000_000 },
      true,
    );
    expect(decision?.selected).toBe('MOCK');
    expect(decision?.usedFallback).toBe(true);
  });

  it('prefers high-value rule for large deposits', () => {
    const decision = resolveGatewayRoute(DEFAULT_GATEWAY_RULES, {
      method: 'VNPAY',
      amount: 150_000_000,
    });
    expect(decision?.ruleId).toBe('rule_high_value');
  });
});
