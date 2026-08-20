import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import { MetaGraphApiError, MetaGraphClient } from './meta-graph.client';
import { generateOAuthState } from './meta-oauth.util';
import { MetaLeadService } from './meta-lead.service';

const OAUTH_STATE_TTL_SEC = 600;
const OAUTH_STATE_PREFIX = 'meta:oauth:state:';

export interface MetaOAuthSession {
  tenantId: string;
  userId?: string;
}

export interface MetaOAuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

@Injectable()
export class MetaOAuthService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly graph: MetaGraphClient,
    private readonly meta: MetaLeadService,
    private readonly config: ConfigService,
  ) {}

  private redirectUri() {
    return this.config.get<string>(
      'META_OAUTH_REDIRECT_URI',
      'http://localhost:3000/api/v1/integrations/meta/oauth/callback',
    );
  }

  successRedirectUrl() {
    return this.config.get<string>(
      'META_OAUTH_SUCCESS_URL',
      'http://localhost:5174/admin/integrations/meta',
    );
  }

  async startAuthorization(tenantId: string, userId?: string) {
    const appId = this.config.get<string>('META_APP_ID');
    if (!appId) {
      throw new UnprocessableEntityException({ detail: 'META_APP_ID not configured' });
    }

    const state = generateOAuthState();
    const session: MetaOAuthSession = { tenantId, userId };
    await this.redis.setex(
      `${OAUTH_STATE_PREFIX}${state}`,
      OAUTH_STATE_TTL_SEC,
      JSON.stringify(session),
    );

    const authorizationUrl = this.graph.buildAuthorizationUrl({
      appId,
      redirectUri: this.redirectUri(),
      state,
    });

    return {
      authorizationUrl,
      state,
      redirectUri: this.redirectUri(),
      expiresIn: OAUTH_STATE_TTL_SEC,
    };
  }

  async handleCallback(query: MetaOAuthCallbackQuery) {
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

    const session = JSON.parse(raw) as MetaOAuthSession;
    const userToken = await this.graph.exchangeAuthorizationCode(code, this.redirectUri());
    const pages = await this.graph.listUserPages(userToken.accessToken);

    const connected: Array<{ pageId: string; pageName: string; subscribed: boolean }> = [];
    for (const page of pages) {
      await this.meta.connectPage(
        session.tenantId,
        {
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.accessToken,
        },
        session.userId,
      );

      let subscribed = false;
      try {
        await this.graph.subscribePageLeadgen(page.id, page.accessToken);
        subscribed = true;
      } catch {
        subscribed = false;
      }

      connected.push({ pageId: page.id, pageName: page.name, subscribed });
    }

    return {
      tenantId: session.tenantId,
      pages: connected,
      graphMode: this.graph.isLiveMode() ? 'LIVE' : 'SANDBOX',
    };
  }

  buildSuccessRedirect(result: { pages: Array<{ pageId: string; pageName: string }> }) {
    const url = new URL(this.successRedirectUrl());
    url.searchParams.set('oauth', 'success');
    if (result.pages[0]) {
      url.searchParams.set('pageId', result.pages[0].pageId);
      url.searchParams.set('pageName', result.pages[0].pageName);
    }
    url.searchParams.set('pageCount', String(result.pages.length));
    url.searchParams.set('graphMode', this.graph.isLiveMode() ? 'LIVE' : 'SANDBOX');
    return url.toString();
  }

  buildErrorRedirect(message: string) {
    const url = new URL(this.successRedirectUrl());
    url.searchParams.set('oauth', 'error');
    url.searchParams.set('message', message.slice(0, 240));
    return url.toString();
  }

  formatCallbackError(err: unknown) {
    if (err instanceof MetaGraphApiError) return err.message;
    if (err instanceof UnprocessableEntityException) {
      const response = err.getResponse();
      if (typeof response === 'object' && response && 'detail' in response) {
        return String((response as { detail: unknown }).detail);
      }
    }
    return err instanceof Error ? err.message : 'Meta OAuth failed';
  }
}
