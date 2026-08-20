import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configEnvReader } from '../config-env-reader';

const DEMO_PASSWORD_MARKERS = [
  'DevAdmin123!',
  'Agent123!',
  'PilotCdt123!',
  'Agency123!',
  'Finance123!',
  'PilotFin123!',
  'PilotAgent123!',
];

export type EnvFlagReader = {
  get(key: string, defaultValue?: string): string | undefined;
};

/** OPS-S2 — staging URLs are strict (C-01), not only NODE_ENV=production. */
export function isStrictProductionEnv(config: EnvFlagReader): boolean {
  return (
    config.get('STRICT_PRODUCTION_SECURITY') === 'true' ||
    config.get('NODE_ENV') === 'production'
  );
}

/** Staging/prod URL — refuse mock/complete and WEBHOOK_SKIP_VERIFY without fail-fast of every C-* gate. */
export function isLiveDeploymentEnv(config: EnvFlagReader): boolean {
  const wereal = (config.get('WEREAL_ENV', '') ?? '').toLowerCase();
  return (
    isStrictProductionEnv(config) ||
    wereal === 'staging' ||
    wereal === 'production' ||
    wereal === 'prod'
  );
}

/** WEBHOOK_SKIP_VERIFY is ignored on staging/prod (OPS-S2-03). */
export function webhookSkipVerifyAllowed(config: EnvFlagReader): boolean {
  if (config.get('WEBHOOK_SKIP_VERIFY') !== 'true') return false;
  return !isLiveDeploymentEnv(config);
}

export type ProductionSecurityCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

/** T7-S2 — fail-fast when STRICT_PRODUCTION_SECURITY or NODE_ENV=production. */
@Injectable()
export class ProductionSecurityService implements OnModuleInit {
  private readonly logger = new Logger(ProductionSecurityService.name);
  private checks: ProductionSecurityCheck[] = [];

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.checks = this.evaluate();
    const failures = this.checks.filter((c) => !c.ok);
    for (const check of this.checks) {
      const msg = `${check.id}: ${check.detail}`;
      if (check.ok) this.logger.log(msg);
      else this.logger.error(msg);
    }
    if (failures.length > 0 && this.isStrict()) {
      throw new Error(
        `Production security gate failed (${failures.map((f) => f.id).join(', ')}) — see pen-test-remediation-S6.md`,
      );
    }
    if (failures.length > 0) {
      this.logger.warn(`${failures.length} security check(s) open (non-strict mode)`);
    }
  }

  getChecks(): ProductionSecurityCheck[] {
    return this.checks.length > 0 ? this.checks : this.evaluate();
  }

  isStrict(): boolean {
    return isStrictProductionEnv(configEnvReader(this.config));
  }

  evaluate(): ProductionSecurityCheck[] {
    const checks: ProductionSecurityCheck[] = [];

    checks.push({
      id: 'C-01',
      ok: this.config.get<string>('WEBHOOK_SKIP_VERIFY') !== 'true',
      detail:
        this.config.get<string>('WEBHOOK_SKIP_VERIFY') === 'true'
          ? 'WEBHOOK_SKIP_VERIFY must not be true'
          : 'WEBHOOK_SKIP_VERIFY off',
    });

    checks.push({
      id: 'C-02',
      ok: this.config.get<string>('PILOT_DEMO_PASSWORDS_ALLOWED') !== 'true',
      detail:
        this.config.get<string>('PILOT_DEMO_PASSWORDS_ALLOWED') === 'true'
          ? 'Rotate pilot demo passwords before prod'
          : 'Demo password bypass not allowed',
    });

    const jwtSecret = this.config.get<string>('JWT_SECRET', '');
    checks.push({
      id: 'C-03',
      ok: !this.isStrict() || jwtSecret.length >= 32,
      detail:
        jwtSecret.length >= 32
          ? 'JWT_SECRET length OK'
          : `JWT_SECRET must be ≥32 chars (got ${jwtSecret.length})`,
    });

    checks.push({
      id: 'C-04',
      ok: !this.isStrict() || this.config.get<string>('TLS_TERMINATED') === 'true',
      detail:
        this.config.get<string>('TLS_TERMINATED') === 'true'
          ? 'TLS termination at ingress'
          : 'Set TLS_TERMINATED=true when HTTPS at load balancer',
    });

    checks.push({
      id: 'H-01',
      ok: this.config.get<string>('AUTH_LOGIN_RATE_LIMIT_ENABLED', 'true') !== 'false',
      detail: 'Auth login rate limit enabled',
    });

    checks.push({
      id: 'MFA-LIVE',
      ok: !this.isStrict() || this.config.get<string>('MFA_SANDBOX') === 'false',
      detail:
        this.config.get<string>('MFA_SANDBOX') === 'false'
          ? 'MFA_SANDBOX=false (TOTP live)'
          : 'MFA_SANDBOX must be false in production',
    });

    const ssoEnabled = this.config.get<string>('SSO_OIDC_ENABLED', 'true') !== 'false';
    checks.push({
      id: 'SSO-LIVE',
      ok: !this.isStrict() || !ssoEnabled || this.config.get<string>('SSO_OIDC_USE_MOCK') === 'false',
      detail:
        this.config.get<string>('SSO_OIDC_USE_MOCK') === 'false'
          ? 'SSO_OIDC_USE_MOCK=false'
          : 'SSO mock must be off when SSO enabled in production',
    });

    if (this.config.get<string>('PILOT_DEMO_PASSWORD_HINTS') === 'true') {
      for (const marker of DEMO_PASSWORD_MARKERS) {
        if (jwtSecret.includes(marker)) {
          checks.push({
            id: 'C-02-hint',
            ok: false,
            detail: 'JWT_SECRET must not embed demo password strings',
          });
        }
      }
    }

    return checks;
  }
}
