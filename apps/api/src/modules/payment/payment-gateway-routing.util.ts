import type { PaymentMethod } from '../../database/entities/payment-intent.entity';

export type GatewayRouteRule = {
  id: string;
  label: string;
  priority: number;
  match: {
    method?: PaymentMethod;
    minAmount?: number;
    maxAmount?: number;
  };
  primary: PaymentMethod;
  fallback: PaymentMethod | null;
  enabled: boolean;
};

export type GatewayRouteInput = {
  method: PaymentMethod;
  amount: number;
};

export type GatewayRouteDecision = {
  ruleId: string;
  primary: PaymentMethod;
  fallback: PaymentMethod | null;
  usedFallback: boolean;
  selected: PaymentMethod;
};

export const DEFAULT_GATEWAY_RULES: GatewayRouteRule[] = [
  {
    id: 'rule_mock_dev',
    label: 'Dev MOCK default',
    priority: 10,
    match: { method: 'MOCK' },
    primary: 'MOCK',
    fallback: null,
    enabled: true,
  },
  {
    id: 'rule_vnpay_default',
    label: 'VNPay production',
    priority: 20,
    match: { method: 'VNPAY' },
    primary: 'VNPAY',
    fallback: 'MOCK',
    enabled: true,
  },
  {
    id: 'rule_high_value',
    label: 'High-value deposit → VNPay primary',
    priority: 30,
    match: { minAmount: 100_000_000 },
    primary: 'VNPAY',
    fallback: 'MOCK',
    enabled: true,
  },
];

export function matchesRule(rule: GatewayRouteRule, input: GatewayRouteInput): boolean {
  if (!rule.enabled) return false;
  if (rule.match.method && rule.match.method !== input.method) return false;
  if (rule.match.minAmount !== undefined && input.amount < rule.match.minAmount) return false;
  if (rule.match.maxAmount !== undefined && input.amount > rule.match.maxAmount) return false;
  return true;
}

/** UC-PAY-05 · FR-PAY-06 — select gateway with optional fallback */
export function resolveGatewayRoute(
  rules: GatewayRouteRule[],
  input: GatewayRouteInput,
  primaryFailed = false,
): GatewayRouteDecision | null {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  const rule = sorted.find((r) => matchesRule(r, input));
  if (!rule) return null;

  const selected =
    primaryFailed && rule.fallback ? rule.fallback : rule.primary;

  return {
    ruleId: rule.id,
    primary: rule.primary,
    fallback: rule.fallback,
    usedFallback: primaryFailed && !!rule.fallback,
    selected,
  };
}
