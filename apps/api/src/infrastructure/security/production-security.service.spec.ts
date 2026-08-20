import { ConfigService } from '@nestjs/config';
import {
  isLiveDeploymentEnv,
  isStrictProductionEnv,
  ProductionSecurityService,
  webhookSkipVerifyAllowed,
} from './production-security.service';

describe('ProductionSecurityService', () => {
  it('passes checks in dev mode with defaults', () => {
    const config = {
      get: jest.fn((key: string, def?: string) => {
        const map: Record<string, string> = {
          NODE_ENV: 'development',
          WEBHOOK_SKIP_VERIFY: 'false',
          MFA_SANDBOX: 'true',
          SSO_OIDC_USE_MOCK: 'true',
          JWT_SECRET: 'short',
        };
        return map[key] ?? def;
      }),
    };
    const service = new ProductionSecurityService(config as unknown as ConfigService);
    const checks = service.evaluate();
    expect(checks.find((c) => c.id === 'C-01')?.ok).toBe(true);
    expect(checks.find((c) => c.id === 'C-03')?.ok).toBe(true);
  });

  it('fails C-03 when strict and JWT_SECRET too short', () => {
    const config = {
      get: jest.fn((key: string, def?: string) => {
        const map: Record<string, string> = {
          NODE_ENV: 'production',
          WEBHOOK_SKIP_VERIFY: 'false',
          MFA_SANDBOX: 'false',
          SSO_OIDC_USE_MOCK: 'false',
          SSO_OIDC_ENABLED: 'true',
          TLS_TERMINATED: 'true',
          JWT_SECRET: 'too-short',
          AUTH_LOGIN_RATE_LIMIT_ENABLED: 'true',
        };
        return map[key] ?? def;
      }),
    };
    const service = new ProductionSecurityService(config as unknown as ConfigService);
    const checks = service.evaluate();
    expect(checks.find((c) => c.id === 'C-03')?.ok).toBe(false);
    expect(checks.find((c) => c.id === 'MFA-LIVE')?.ok).toBe(true);
  });

  it('refuses WEBHOOK_SKIP_VERIFY on WEREAL_ENV=staging without fail-fast of all C-* gates', () => {
    const config = {
      get: (key: string, def?: string) => {
        const map: Record<string, string> = {
          NODE_ENV: 'development',
          WEREAL_ENV: 'staging',
          WEBHOOK_SKIP_VERIFY: 'true',
        };
        return map[key] ?? def;
      },
    };
    expect(isStrictProductionEnv(config)).toBe(false);
    expect(isLiveDeploymentEnv(config)).toBe(true);
    expect(webhookSkipVerifyAllowed(config)).toBe(false);

    const service = new ProductionSecurityService(config as unknown as ConfigService);
    expect(service.isStrict()).toBe(false);
    expect(service.evaluate().find((c) => c.id === 'C-01')?.ok).toBe(false);
  });

  it('allows WEBHOOK_SKIP_VERIFY only in local non-strict', () => {
    const config = {
      get: (key: string, def?: string) => {
        const map: Record<string, string> = {
          NODE_ENV: 'development',
          WEBHOOK_SKIP_VERIFY: 'true',
        };
        return map[key] ?? def;
      },
    };
    expect(isStrictProductionEnv(config)).toBe(false);
    expect(webhookSkipVerifyAllowed(config)).toBe(true);
  });
});
