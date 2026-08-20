import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildZnsTemplateData,
  formatPhoneForZaloApi,
  type ZaloOAuthTokenResponse,
  type ZaloOaProfileResponse,
  type ZaloZnsSendInput,
  type ZaloZnsSendResponse,
} from './zalo-graph.types';

export class ZaloGraphApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly providerMessage?: string,
  ) {
    super(message);
    this.name = 'ZaloGraphApiError';
  }
}

@Injectable()
export class ZaloGraphClient {
  private readonly logger = new Logger(ZaloGraphClient.name);

  constructor(private readonly config: ConfigService) {}

  private oauthUrl() {
    return this.config.get<string>(
      'ZALO_OAUTH_URL',
      'https://oauth.zaloapp.com/v4/oa/access_token',
    );
  }

  private znsUrl() {
    return this.config.get<string>(
      'ZALO_ZNS_URL',
      'https://business.openapi.zalo.me/message/template',
    );
  }

  private graphBaseUrl() {
    return this.config.get<string>('ZALO_GRAPH_API_BASE', 'https://openapi.zalo.me/v3.0');
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const tokens = await this.requestTokens(
      new URLSearchParams({
        refresh_token: refreshToken,
        app_id: this.requireAppId(),
        grant_type: 'refresh_token',
      }),
      'Zalo OAuth refresh failed',
    );
    return {
      ...tokens,
      refreshToken: tokens.refreshToken || refreshToken,
    };
  }

  async exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const tokens = await this.requestTokens(
      new URLSearchParams({
        app_id: this.requireAppId(),
        code,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      'Zalo OAuth code exchange failed',
    );
    if (!tokens.refreshToken) {
      throw new ZaloGraphApiError('Zalo OAuth code exchange missing refresh_token');
    }
    return tokens;
  }

  private requireAppId() {
    const appId = this.config.get<string>('ZALO_APP_ID');
    if (!appId) {
      throw new ZaloGraphApiError('ZALO_APP_ID required for OAuth');
    }
    return appId;
  }

  private requireSecret() {
    const secret = this.config.get<string>('ZALO_OA_SECRET');
    if (!secret) {
      throw new ZaloGraphApiError('ZALO_OA_SECRET required for OAuth');
    }
    return secret;
  }

  private async requestTokens(body: URLSearchParams, failureMessage: string) {
    const res = await fetch(this.oauthUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key: this.requireSecret(),
      },
      body: body.toString(),
    });

    const json = (await res.json()) as ZaloOAuthTokenResponse;
    if (!res.ok || json.error || !json.access_token) {
      throw new ZaloGraphApiError(
        json.error_reason ?? json.message ?? failureMessage,
        json.error,
        json.message,
      );
    }

    const expiresInSec = Number(json.expires_in ?? 86_400);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? '',
      expiresAt: new Date(Date.now() + expiresInSec * 1000),
    };
  }

  async sendZnsTemplate(input: ZaloZnsSendInput): Promise<{ msgId: string; sentTime?: string }> {
    const payload = {
      phone: formatPhoneForZaloApi(input.phone),
      template_id: input.templateId,
      template_data: input.templateData,
      tracking_id: input.trackingId,
    };

    const res = await fetch(this.znsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: input.accessToken,
      },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as ZaloZnsSendResponse;
    if (!res.ok || json.error !== 0 || !json.data?.msg_id) {
      throw new ZaloGraphApiError(
        json.message ?? 'Zalo ZNS send failed',
        json.error,
        json.message,
      );
    }

    this.logger.log(`Zalo ZNS sent msg_id=${json.data.msg_id} tracking=${input.trackingId}`);

    return {
      msgId: json.data.msg_id,
      sentTime: json.data.sent_time,
    };
  }

  async getOaProfile(accessToken: string): Promise<ZaloOaProfileResponse['data']> {
    const res = await fetch(`${this.graphBaseUrl()}/oa/getoa`, {
      method: 'GET',
      headers: { access_token: accessToken },
    });

    const json = (await res.json()) as ZaloOaProfileResponse;
    if (!res.ok || json.error !== 0) {
      throw new ZaloGraphApiError(json.message ?? 'Zalo get OA profile failed', json.error);
    }

    return json.data;
  }

  buildTemplateData(templateId: string, params: Record<string, unknown>) {
    return buildZnsTemplateData(templateId, params);
  }
}
