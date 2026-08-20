import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildMetaAuthorizationUrl } from './meta-oauth.util';
import type { MetaGraphLeadResponse } from './meta-graph.types';

export class MetaGraphApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly providerMessage?: string,
  ) {
    super(message);
    this.name = 'MetaGraphApiError';
  }
}

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);

  constructor(private readonly config: ConfigService) {}

  graphBaseUrl() {
    return this.config.get<string>('META_GRAPH_API_BASE', 'https://graph.facebook.com/v21.0');
  }

  isLiveMode(): boolean {
    return this.config.get<string>('META_GRAPH_SANDBOX', 'true') === 'false';
  }

  buildAuthorizationUrl(input: { appId: string; redirectUri: string; state: string }) {
    return buildMetaAuthorizationUrl(input);
  }

  /** Exchange OAuth authorization code for user access token */
  async exchangeAuthorizationCode(code: string, redirectUri: string) {
    const appId = this.config.get<string>('META_APP_ID');
    const appSecret = this.config.get<string>('META_APP_SECRET');
    if (!appId || !appSecret) {
      throw new MetaGraphApiError('META_APP_ID and META_APP_SECRET required for OAuth');
    }

    const url = new URL(`${this.graphBaseUrl()}/oauth/access_token`);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code', code);

    const res = await fetch(url.toString(), { method: 'GET' });
    const json = (await res.json()) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { message?: string; code?: number };
    };

    if (!res.ok || json.error || !json.access_token) {
      throw new MetaGraphApiError(
        json.error?.message ?? `Meta OAuth token exchange failed (${res.status})`,
        json.error?.code,
        json.error?.message,
      );
    }

    this.logger.log('Meta OAuth user token exchanged');
    return {
      accessToken: json.access_token,
      tokenType: json.token_type ?? 'bearer',
      expiresIn: json.expires_in,
    };
  }

  /** List pages the user manages (includes page access tokens) */
  async listUserPages(userAccessToken: string) {
    const url = `${this.graphBaseUrl()}/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`;
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json()) as {
      data?: Array<{ id: string; name: string; access_token: string }>;
      error?: { message?: string; code?: number };
    };

    if (!res.ok || json.error) {
      throw new MetaGraphApiError(
        json.error?.message ?? `Meta list pages failed (${res.status})`,
        json.error?.code,
        json.error?.message,
      );
    }

    return (json.data ?? []).map((page) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
    }));
  }

  /** Subscribe app to leadgen webhooks on a page */
  async subscribePageLeadgen(pageId: string, pageAccessToken: string) {
    const url = `${this.graphBaseUrl()}/${encodeURIComponent(pageId)}/subscribed_apps`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        subscribed_fields: 'leadgen',
        access_token: pageAccessToken,
      }),
    });
    const json = (await res.json()) as { success?: boolean; error?: { message?: string; code?: number } };

    if (!res.ok || json.error || json.success === false) {
      throw new MetaGraphApiError(
        json.error?.message ?? `Meta page subscribe failed (${res.status})`,
        json.error?.code,
        json.error?.message,
      );
    }

    this.logger.log(`Meta page ${pageId} subscribed to leadgen`);
    return { success: true as const };
  }

  /** UC-NW-02 Phase 2 — fetch lead payload when webhook omits field_data */
  async fetchLead(leadgenId: string, pageAccessToken: string): Promise<MetaGraphLeadResponse> {
    const url = `${this.graphBaseUrl()}/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json()) as MetaGraphLeadResponse;

    if (!res.ok || json.error) {
      throw new MetaGraphApiError(
        json.error?.message ?? `Meta Graph lead fetch failed (${res.status})`,
        json.error?.code,
        json.error?.message,
      );
    }

    if (!json.field_data?.length) {
      throw new MetaGraphApiError('Meta Graph lead missing field_data');
    }

    this.logger.log(`Meta Graph fetched lead ${leadgenId}`);
    return json;
  }
}
