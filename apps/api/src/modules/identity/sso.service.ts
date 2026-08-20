import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { AuthService } from './auth.service';
import {
  buildAuthorizeUrl,
  buildMockAuthorizeUrl,
  createOidcState,
  createPkcePair,
  exchangeAuthorizationCode,
  fetchOidcDiscovery,
  parseIdTokenClaims,
  parseOidcState,
} from './sso-oidc.client';
import {
  DEFAULT_SSO_ROLE_MAPPING,
  validateSsoProvider,
  type SsoProviderConfig,
  type SsoProviderType,
} from './sso.util';

type PendingOidc = {
  tenantId: string;
  providerId: string;
  codeVerifier: string;
  emailHint?: string;
  expiresAt: number;
};

@Injectable()
export class SsoService {
  private readonly pendingOidc = new Map<string, PendingOidc>();

  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEvents: Repository<AuditEventEntity>,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly tenantConfig: TenantConfigService,
    private readonly rails: RailResolverService,
  ) {}

  /** OPS-S6-03 — tenant LIVE_RAILS.ssoOidc* wins over process env. */
  private async ssoRails(tenantId: string) {
    const resolved = await this.rails.resolve(tenantId);
    return { enabled: resolved.ssoOidcEnabled, mock: resolved.ssoOidcMock };
  }

  status() {
    return {
      module: 'sso',
      uc: 'UC-ID-06',
      screen: 'SCR-AUTH-002',
      protocols: ['OIDC', 'SAML'],
      note: 'Per-tenant via LIVE_RAILS.ssoOidcEnabled / ssoOidcMock',
      sprint: 'S6',
    };
  }

  async tenantStatus(tenantId: string) {
    const rails = await this.ssoRails(tenantId);
    return {
      enabled: rails.enabled,
      mode: rails.mock ? 'oidc-mock-callback' : 'oidc-live',
      optional: true,
      tenantId,
    };
  }

  async listProviders(tenantId: string) {
    const rails = await this.ssoRails(tenantId);
    if (!rails.enabled) {
      return {
        data: [],
        meta: {
          tenantId,
          count: 0,
          uc: ['UC-ID-06'],
          screen: 'SCR-AUTH-002',
          ssoOptional: true,
          reason: 'SSO not enabled on tenant (OPS-S6-03 optional)',
        },
      };
    }
    const providers = await this.loadProviders(tenantId);
    return {
      data: providers,
      meta: { tenantId, count: providers.length, uc: ['UC-ID-06'], screen: 'SCR-AUTH-002' },
    };
  }

  async upsertProvider(
    tenantId: string,
    input: {
      type: SsoProviderType;
      label: string;
      issuerUrl: string;
      clientId: string;
      enabled?: boolean;
      roleMapping?: Record<string, string>;
    },
    actorId?: string,
  ) {
    const errors = validateSsoProvider(input);
    if (errors.length) {
      throw new UnprocessableEntityException({ detail: errors.join(', ') });
    }

    const provider: SsoProviderConfig = {
      id: `sso_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      type: input.type,
      label: input.label.trim(),
      issuerUrl: input.issuerUrl.trim(),
      clientId: input.clientId.trim(),
      enabled: input.enabled ?? true,
      roleMapping: input.roleMapping ?? { ...DEFAULT_SSO_ROLE_MAPPING },
      createdAt: new Date().toISOString(),
    };

    await this.tenantConfig.saveSsoProvider(tenantId, provider, actorId);

    return this.listProviders(tenantId);
  }

  async beginAuthorize(
    tenantId: string,
    input: { providerId: string; emailHint?: string; redirectUri?: string },
  ) {
    const rails = await this.ssoRails(tenantId);
    if (!rails.enabled) {
      throw new UnprocessableEntityException({
        detail: 'SSO not enabled for this tenant (optional — enable via LIVE_RAILS.ssoOidcEnabled)',
      });
    }

    const providers = await this.loadProviders(tenantId);
    const provider = providers.find((p) => p.id === input.providerId.trim() && p.enabled);
    if (!provider) {
      throw new UnprocessableEntityException({ detail: 'SSO provider not found or disabled' });
    }

    const callbackUrl =
      input.redirectUri?.trim() ||
      this.config.get<string>(
        'SSO_OIDC_CALLBACK_URL',
        'http://localhost:5174/auth/sso/callback',
      );
    const apiCallback = this.config.get<string>(
      'SSO_OIDC_API_CALLBACK_URL',
      'http://localhost:3000/api/v1/auth/sso/callback',
    );

    const { verifier, challenge } = createPkcePair();
    const state = createOidcState({
      tenantId,
      providerId: provider.id,
      emailHint: input.emailHint?.trim(),
      webRedirect: callbackUrl,
    });
    this.pendingOidc.set(state, {
      tenantId,
      providerId: provider.id,
      codeVerifier: verifier,
      emailHint: input.emailHint?.trim(),
      expiresAt: Date.now() + 10 * 60_000,
    });

    const useMock = rails.mock;
    if (useMock) {
      return {
        data: {
          authorizationUrl: buildMockAuthorizeUrl({ callbackUrl: apiCallback, state }),
          state,
          mode: 'oidc-mock-callback',
        },
        meta: { uc: ['UC-ID-06'], screen: 'SCR-AUTH-002' },
      };
    }

    const discovery = await fetchOidcDiscovery(provider.issuerUrl);
    const authorizationUrl = buildAuthorizeUrl({
      discovery,
      clientId: provider.clientId,
      redirectUri: apiCallback,
      state,
      codeChallenge: challenge,
    });

    return {
      data: { authorizationUrl, state, mode: 'oidc-live' },
      meta: { uc: ['UC-ID-06'], screen: 'SCR-AUTH-002' },
    };
  }

  async handleCallback(input: { code: string; state: string }) {
    const statePayload = parseOidcState(input.state);
    const pending = this.pendingOidc.get(input.state);
    if (!pending || pending.expiresAt < Date.now()) {
      throw new UnauthorizedException({ detail: 'Invalid or expired SSO state' });
    }
    this.pendingOidc.delete(input.state);

    const tenantId = pending.tenantId;
    const providers = await this.loadProviders(tenantId);
    const provider = providers.find((p) => p.id === pending.providerId);
    if (!provider) {
      throw new UnauthorizedException({ detail: 'SSO provider no longer available' });
    }

    let email = pending.emailHint ?? '';
    let externalGroups: string[] = [];

    const rails = await this.ssoRails(tenantId);
    const useMock = rails.mock;
    if (useMock && input.code === 'mock_sso_code') {
      email = email || 'agent@sunrise-dev.vn';
      externalGroups = ['wereal-agents'];
    } else {
      const clientSecret = this.config.get<string>('SSO_OIDC_CLIENT_SECRET', '');
      if (!clientSecret) {
        throw new UnprocessableEntityException({ detail: 'SSO_OIDC_CLIENT_SECRET required for live OIDC' });
      }
      const apiCallback = this.config.get<string>(
        'SSO_OIDC_API_CALLBACK_URL',
        'http://localhost:3000/api/v1/auth/sso/callback',
      );
      const discovery = await fetchOidcDiscovery(provider.issuerUrl);
      const tokens = await exchangeAuthorizationCode({
        discovery,
        clientId: provider.clientId,
        clientSecret,
        code: input.code,
        redirectUri: apiCallback,
        codeVerifier: pending.codeVerifier,
      });
      const claims = parseIdTokenClaims(tokens.id_token ?? '');
      email =
        (typeof claims.email === 'string' && claims.email) ||
        (typeof claims.preferred_username === 'string' && claims.preferred_username) ||
        email;
      externalGroups = Array.isArray(claims.groups)
        ? claims.groups.filter((g): g is string => typeof g === 'string')
        : [];
    }

    if (!email) {
      throw new UnauthorizedException({ detail: 'OIDC id_token missing email claim' });
    }

    const allowlist = this.config.get<string>('SSO_EMAIL_DOMAIN_ALLOWLIST', '');
    if (allowlist.trim()) {
      const domain = email.split('@')[1]?.toLowerCase();
      const allowed = allowlist
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      if (!domain || !allowed.includes(domain)) {
        throw new UnauthorizedException({ detail: 'Email domain not allowed for SSO' });
      }
    }

    const group = externalGroups[0] ?? 'enterprise-agent';
    const mappedRole = provider.roleMapping[group] ?? 'AGENT';

    await this.audit.append({
      tenantId,
      entityType: 'sso_login',
      entityId: provider.id,
      action: 'CALLBACK',
      payload: { email, mappedRole, mode: useMock ? 'oidc-mock-callback' : 'oidc-live' },
      actorId: null,
    });

    const session = await this.auth.loginViaSsoEmail(tenantId, email);
    const webRedirect =
      (typeof statePayload?.webRedirect === 'string' && statePayload.webRedirect) ||
      this.config.get<string>('SSO_OIDC_CALLBACK_URL', 'http://localhost:5174/auth/sso/callback');

    return {
      data: {
        ...session.data,
        redirectUrl: webRedirect,
        mappedRole,
        providerId: provider.id,
      },
      meta: { uc: ['UC-ID-06'], screen: 'SCR-AUTH-002', mode: useMock ? 'oidc-mock-callback' : 'oidc-live' },
    };
  }

  /** Legacy pilot login — kept for admin testing */
  async login(
    tenantId: string,
    input: { providerId: string; email: string; externalGroups?: string[] },
  ) {
    const authorize = await this.beginAuthorize(tenantId, {
      providerId: input.providerId,
      emailHint: input.email,
    });
    return {
      data: {
        providerId: input.providerId,
        email: input.email.trim(),
        mappedRole:
          DEFAULT_SSO_ROLE_MAPPING[input.externalGroups?.[0] ?? 'enterprise-agent'] ?? 'AGENT',
        authorizationUrl: authorize.data.authorizationUrl,
        note: 'Use GET /auth/sso/authorize flow for production JWT',
      },
      meta: { uc: ['UC-ID-06'], screen: 'SCR-AUTH-002' },
    };
  }

  private async loadProviders(tenantId: string): Promise<SsoProviderConfig[]> {
    return this.tenantConfig.loadSsoProviders(tenantId);
  }
}
