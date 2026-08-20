import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import { ZaloGraphApiError, ZaloGraphClient } from './zalo-graph.client';
import {
  buildZaloOaAuthorizationUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from './zalo-oauth.util';
import { ZaloTokenService } from './zalo-token.service';

const OAUTH_STATE_TTL_SEC = 600;
const OAUTH_STATE_PREFIX = 'zalo:oauth:state:';

export interface ZaloOAuthSession {
  tenantId: string;
  oaId: string;
  codeVerifier: string;
  userId?: string;
}

export interface ZaloOAuthCallbackQuery {
  code?: string;
  state?: string;
  oa_id?: string;
  error?: string;
  error_description?: string;
}

@Injectable()
export class ZaloOAuthService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly graph: ZaloGraphClient,
    private readonly tokens: ZaloTokenService,
    private readonly config: ConfigService,
  ) {}

  private redirectUri() {
    return this.config.get<string>(
      'ZALO_OAUTH_REDIRECT_URI',
      'http://localhost:3000/api/v1/integrations/zalo/oauth/callback',
    );
  }

  successRedirectUrl() {
    return this.config.get<string>(
      'ZALO_OAUTH_SUCCESS_URL',
      'http://localhost:5174/admin/integrations/zalo',
    );
  }

  async startAuthorization(tenantId: string, oaId: string, userId?: string) {
    const appId = this.config.get<string>('ZALO_APP_ID');
    if (!appId) {
      throw new UnprocessableEntityException({ detail: 'ZALO_APP_ID not configured' });
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateOAuthState();

    const session: ZaloOAuthSession = { tenantId, oaId, codeVerifier, userId };
    await this.redis.setex(`${OAUTH_STATE_PREFIX}${state}`, OAUTH_STATE_TTL_SEC, JSON.stringify(session));

    const authorizationUrl = buildZaloOaAuthorizationUrl({
      appId,
      redirectUri: this.redirectUri(),
      codeChallenge,
      state,
    });

    return {
      authorizationUrl,
      state,
      redirectUri: this.redirectUri(),
      expiresIn: OAUTH_STATE_TTL_SEC,
    };
  }

  async handleCallback(query: ZaloOAuthCallbackQuery) {
    if (query.error) {
      throw new UnprocessableEntityException({
        detail: query.error_description ?? query.error,
      });
    }

    const code = query.code?.trim();
    const state = query.state?.trim();
    if (!code || !state) {
      throw new UnprocessableEntityException({ detail: 'OAuth code and state required' });
    }

    const raw = await this.redis.get(`${OAUTH_STATE_PREFIX}${state}`);
    if (!raw) {
      throw new UnprocessableEntityException({ detail: 'Invalid or expired OAuth state' });
    }
    await this.redis.del(`${OAUTH_STATE_PREFIX}${state}`);

    const session = JSON.parse(raw) as ZaloOAuthSession;
    const exchanged = await this.graph.exchangeAuthorizationCode(code, session.codeVerifier);
    const oaId = query.oa_id?.trim() || session.oaId;

    const connected = await this.tokens.saveOAuthTokens(session.tenantId, oaId, exchanged);

    return {
      tenantId: session.tenantId,
      oaId: connected.oaId,
      tokenExpiresAt: connected.tokenExpiresAt,
      graphMode: connected.graphMode,
    };
  }

  buildSuccessRedirect(result: { oaId: string; graphMode?: string }) {
    const url = new URL(this.successRedirectUrl());
    url.searchParams.set('oauth', 'success');
    url.searchParams.set('oaId', result.oaId);
    if (result.graphMode) url.searchParams.set('graphMode', result.graphMode);
    return url.toString();
  }

  buildErrorRedirect(message: string) {
    const url = new URL(this.successRedirectUrl());
    url.searchParams.set('oauth', 'error');
    url.searchParams.set('message', message.slice(0, 240));
    return url.toString();
  }

  formatCallbackError(err: unknown) {
    if (err instanceof ZaloGraphApiError) return err.message;
    if (err instanceof UnprocessableEntityException) {
      const response = err.getResponse();
      if (typeof response === 'object' && response && 'detail' in response) {
        return String((response as { detail: unknown }).detail);
      }
    }
    return err instanceof Error ? err.message : 'Zalo OAuth failed';
  }
}
