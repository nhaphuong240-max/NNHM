import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloOaBindingEntity } from '../../database/entities/zalo-oa-binding.entity';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { ZaloGraphApiError, ZaloGraphClient } from './zalo-graph.client';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

@Injectable()
export class ZaloTokenService {
  constructor(
    @InjectRepository(ZaloOaBindingEntity)
    private readonly oas: Repository<ZaloOaBindingEntity>,
    private readonly graph: ZaloGraphClient,
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  /** OPS-S4-01 — tenant LIVE_RAILS.znsSandbox wins over ZALO_ZNS_SANDBOX env. */
  async isSandboxMode(tenantId: string) {
    const resolved = await this.rails.resolve(tenantId);
    return resolved.znsSandbox;
  }

  async graphMode(tenantId: string, binding: ZaloOaBindingEntity | null) {
    if (await this.isSandboxMode(tenantId)) return 'SANDBOX' as const;
    if (binding?.accessToken || binding?.refreshToken) return 'LIVE' as const;
    if (this.config.get<string>('ZALO_OA_ACCESS_TOKEN') || this.config.get<string>('ZALO_OA_REFRESH_TOKEN')) {
      return 'LIVE' as const;
    }
    return 'UNCONFIGURED' as const;
  }

  hasLiveCredentials(tenantId: string, binding: ZaloOaBindingEntity | null) {
    return this.graphMode(tenantId, binding).then((mode) => mode === 'LIVE');
  }

  async connectTokens(
    tenantId: string,
    oaId: string,
    input: { refreshToken: string; accessToken?: string; expiresIn?: number },
  ) {
    const binding = await this.oas.findOne({ where: { tenantId, oaId, isActive: true } });
    if (!binding) {
      throw new UnprocessableEntityException({ detail: `Zalo OA ${oaId} not bound to tenant` });
    }

    let accessToken = input.accessToken?.trim() || null;
    let refreshToken = input.refreshToken.trim();
    let tokenExpiresAt: Date | null = input.expiresIn
      ? new Date(Date.now() + input.expiresIn * 1000)
      : null;

    if (!accessToken) {
      const refreshed = await this.graph.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
      tokenExpiresAt = refreshed.expiresAt;
    }

    return this.persistTokens(binding, accessToken, refreshToken, tokenExpiresAt, oaId);
  }

  /** Save tokens from OAuth redirect callback */
  async saveOAuthTokens(
    tenantId: string,
    oaId: string,
    tokens: { accessToken: string; refreshToken: string; expiresAt: Date },
  ) {
    let binding =
      (await this.oas.findOne({ where: { tenantId, oaId, isActive: true } })) ??
      (await this.oas.findOne({ where: { tenantId, isActive: true } }));

    if (!binding) {
      throw new UnprocessableEntityException({ detail: `Zalo OA binding not found for tenant ${tenantId}` });
    }

    return this.persistTokens(
      binding,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresAt,
      oaId,
    );
  }

  private async persistTokens(
    binding: ZaloOaBindingEntity,
    accessToken: string,
    refreshToken: string,
    tokenExpiresAt: Date | null,
    oaId?: string,
  ) {
    if (oaId && binding.oaId !== oaId) {
      binding.oaId = oaId;
    }

    binding.accessToken = accessToken;
    binding.refreshToken = refreshToken;
    binding.tokenExpiresAt = tokenExpiresAt;
    await this.oas.save(binding);

    return {
      oaId: binding.oaId,
      connected: true,
      tokenExpiresAt: binding.tokenExpiresAt?.toISOString() ?? null,
      graphMode: await this.graphMode(binding.tenantId, binding),
    };
  }

  async getAccessToken(binding: ZaloOaBindingEntity): Promise<string> {
    const envToken = this.config.get<string>('ZALO_OA_ACCESS_TOKEN');
    const envRefresh = this.config.get<string>('ZALO_OA_REFRESH_TOKEN');

    if (
      binding.accessToken &&
      binding.tokenExpiresAt &&
      binding.tokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS
    ) {
      return binding.accessToken;
    }

    const refreshToken = binding.refreshToken ?? envRefresh;
    if (refreshToken) {
      const refreshed = await this.graph.refreshAccessToken(refreshToken);
      binding.accessToken = refreshed.accessToken;
      binding.refreshToken = refreshed.refreshToken;
      binding.tokenExpiresAt = refreshed.expiresAt;
      await this.oas.save(binding);
      return refreshed.accessToken;
    }

    if (envToken) return envToken;
    if (binding.accessToken) return binding.accessToken;

    throw new UnprocessableEntityException({
      detail: 'Zalo OA access token missing — connect via GET /integrations/zalo/oauth/start',
    });
  }

  async verifyConnection(tenantId: string, binding: ZaloOaBindingEntity) {
    try {
      const token = await this.getAccessToken(binding);
      const profile = await this.graph.getOaProfile(token);
      return {
        ok: true as const,
        oaId: profile?.oa_id ?? binding.oaId,
        oaName: profile?.name ?? binding.oaName,
        verified: profile?.is_verified ?? false,
      };
    } catch (err) {
      const message = err instanceof ZaloGraphApiError ? err.message : String(err);
      return { ok: false as const, error: message };
    }
  }
}
