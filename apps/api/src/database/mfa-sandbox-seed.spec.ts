import { mfaSandboxSeedAllowed } from './mfa-sandbox-seed';

describe('mfaSandboxSeedAllowed', () => {
  it('allows the sandbox flag only in development and test', () => {
    expect(mfaSandboxSeedAllowed('development', 'true')).toBe(true);
    expect(mfaSandboxSeedAllowed('test', 'true')).toBe(true);
  });

  it('refuses production, staging, an empty environment, and any flag other than true', () => {
    expect(mfaSandboxSeedAllowed('production', 'true')).toBe(false);
    expect(mfaSandboxSeedAllowed('staging', 'true')).toBe(false);
    expect(mfaSandboxSeedAllowed('', 'true')).toBe(false);
    expect(mfaSandboxSeedAllowed(undefined, 'true')).toBe(false);
    expect(mfaSandboxSeedAllowed('development', 'false')).toBe(false);
    expect(mfaSandboxSeedAllowed('development', undefined)).toBe(false);
    expect(mfaSandboxSeedAllowed('development', 'TRUE')).toBe(false);
  });
});
