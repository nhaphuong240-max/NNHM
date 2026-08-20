import { liveRailsFromEnv, mergeLiveRails, parseLiveRailsOverlay } from './live-rails.util';

describe('live-rails.util', () => {
  const env = (overrides: Record<string, string> = {}) => ({
    get: (key: string, fallback?: string) => overrides[key] ?? fallback,
  });

  it('defaults to MOCK + sandbox simulate on fromEnv', () => {
    const rails = liveRailsFromEnv(env());
    expect(rails.paymentMethod).toBe('MOCK');
    expect(rails.vnpaySandbox).toBe(true);
    expect(rails.simulateEndpoints).toBe(true);
    expect(rails.escrowEnabled).toBe(false);
    expect(rails.bnplEnabled).toBe(false);
  });

  it('disables simulate in production env', () => {
    const rails = liveRailsFromEnv(env({ NODE_ENV: 'production' }));
    expect(rails.simulateEndpoints).toBe(false);
  });

  it('merges tenant overlay over env (pilot VNPAY, no simulate)', () => {
    const merged = mergeLiveRails(liveRailsFromEnv(env()), {
      paymentMethod: 'VNPAY',
      simulateEndpoints: false,
      mfaSandbox: false,
    });
    expect(merged.paymentMethod).toBe('VNPAY');
    expect(merged.simulateEndpoints).toBe(false);
    expect(merged.mfaSandbox).toBe(false);
  });

  it('parseLiveRailsOverlay ignores invalid paymentMethod', () => {
    expect(parseLiveRailsOverlay({ paymentMethod: 'PAYPAL', vnpaySandbox: true })).toEqual({
      vnpaySandbox: true,
    });
  });
});
