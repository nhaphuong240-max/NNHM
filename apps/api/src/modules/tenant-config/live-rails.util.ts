import type { PaymentMethod } from '../../database/entities/payment-intent.entity';

/** OPS-S1 — tenant overlay for live rails. Missing keys inherit process env. */
export type LiveRails = {
  paymentMethod: PaymentMethod;
  vnpaySandbox: boolean;
  mfaSandbox: boolean;
  smsSandbox: boolean;
  znsSandbox: boolean;
  esignSandbox: boolean;
  ekycSandbox: boolean;
  payoutStub: boolean;
  payoutEnabled: boolean;
  escrowEnabled: boolean;
  bnplEnabled: boolean;
  simulateEndpoints: boolean;
  /** OPS-S4-05 — Expo push on new lead when true (tenant overlay > PUSH_LIVE_ENABLED env). */
  pushLiveEnabled: boolean;
  /** OPS-S6-03 — SSO OIDC optional per tenant; default off on pilot. */
  ssoOidcEnabled: boolean;
  ssoOidcMock: boolean;
};

export const LIVE_RAILS_KEYS = [
  'paymentMethod',
  'vnpaySandbox',
  'mfaSandbox',
  'smsSandbox',
  'znsSandbox',
  'esignSandbox',
  'ekycSandbox',
  'payoutStub',
  'payoutEnabled',
  'escrowEnabled',
  'bnplEnabled',
  'simulateEndpoints',
  'pushLiveEnabled',
  'ssoOidcEnabled',
  'ssoOidcMock',
] as const;

export type LiveRailsKey = (typeof LIVE_RAILS_KEYS)[number];

export type EnvReader = {
  get(key: string, defaultValue?: string): string | undefined;
};

export function liveRailsFromEnv(config: EnvReader): LiveRails {
  const flag = (key: string, fallback: string) => config.get(key, fallback) ?? fallback;
  const payoutEnabled = flag('SETTLEMENT_PAYOUT_ENABLED', 'false') === 'true';
  const payoutStubExplicit = flag('SETTLEMENT_PAYOUT_STUB', 'false') === 'true';

  return {
    paymentMethod: flag('PAYMENT_DEFAULT_METHOD', 'MOCK') === 'VNPAY' ? 'VNPAY' : 'MOCK',
    vnpaySandbox: flag('VNPAY_SANDBOX', 'true') !== 'false',
    mfaSandbox: flag('MFA_SANDBOX', 'true') !== 'false',
    smsSandbox: flag('SMS_SANDBOX', 'true') !== 'false',
    znsSandbox: flag('ZALO_ZNS_SANDBOX', 'true') !== 'false',
    esignSandbox: flag('ESIGN_SANDBOX', 'true') !== 'false',
    ekycSandbox: flag('EKYC_SANDBOX', 'true') !== 'false',
    payoutEnabled,
    payoutStub: payoutStubExplicit || !payoutEnabled,
    escrowEnabled: flag('ESCROW_BANK_PARTNER_ENABLED', 'false') === 'true',
    bnplEnabled: flag('BNPL_PARTNER_ENABLED', 'false') === 'true',
    simulateEndpoints:
      flag('NODE_ENV', 'development') !== 'production' &&
      flag('STRICT_PRODUCTION_SECURITY', 'false') !== 'true',
    pushLiveEnabled: flag('PUSH_LIVE_ENABLED', 'false') === 'true',
    ssoOidcEnabled: flag('SSO_OIDC_ENABLED', 'false') === 'true',
    ssoOidcMock: flag('SSO_OIDC_USE_MOCK', 'true') !== 'false',
  };
}

export function parseLiveRailsOverlay(payload: Record<string, unknown> | null | undefined): Partial<LiveRails> {
  if (!payload) return {};
  const overlay: Partial<LiveRails> = {};

  if (payload.paymentMethod === 'VNPAY' || payload.paymentMethod === 'MOCK') {
    overlay.paymentMethod = payload.paymentMethod;
  }

  for (const key of LIVE_RAILS_KEYS) {
    if (key === 'paymentMethod') continue;
    const value = payload[key];
    if (typeof value === 'boolean') {
      overlay[key] = value;
    }
  }

  return overlay;
}

export function mergeLiveRails(base: LiveRails, overlay: Partial<LiveRails> | null | undefined): LiveRails {
  if (!overlay) return { ...base };
  const merged = { ...base };
  for (const key of LIVE_RAILS_KEYS) {
    const value = overlay[key];
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
