import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import { ZaloGraphClient } from './zalo-graph.client';
import { ZaloOAuthService } from './zalo-oauth.service';
import { ZaloTokenService } from './zalo-token.service';

describe('ZaloOAuthService', () => {
  let service: ZaloOAuthService;
  const redisStore = new Map<string, string>();
  const exchangeAuthorizationCode = jest.fn();
  const saveOAuthTokens = jest.fn();

  beforeEach(async () => {
    redisStore.clear();
    exchangeAuthorizationCode.mockReset();
    saveOAuthTokens.mockReset();
    exchangeAuthorizationCode.mockResolvedValue({
      accessToken: 'at_live',
      refreshToken: 'rt_live',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    saveOAuthTokens.mockResolvedValue({
      oaId: 'oa_real_01',
      connected: true,
      tokenExpiresAt: new Date().toISOString(),
      graphMode: 'LIVE',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZaloOAuthService,
        {
          provide: REDIS_CLIENT,
          useValue: {
            setex: jest.fn(async (key: string, _ttl: number, value: string) => {
              redisStore.set(key, value);
            }),
            get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
            del: jest.fn(async (key: string) => {
              redisStore.delete(key);
            }),
          },
        },
        { provide: ZaloGraphClient, useValue: { exchangeAuthorizationCode } },
        { provide: ZaloTokenService, useValue: { saveOAuthTokens } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'ZALO_APP_ID') return 'app_123';
              if (key === 'ZALO_OAUTH_REDIRECT_URI') {
                return 'http://localhost:3000/api/v1/integrations/zalo/oauth/callback';
              }
              if (key === 'ZALO_OAUTH_SUCCESS_URL') {
                return 'http://localhost:5174/admin/integrations/zalo';
              }
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ZaloOAuthService);
  });

  it('starts OAuth with PKCE authorization URL', async () => {
    const result = await service.startAuthorization('ten_dev_01', 'oa_sunrise_dev');
    expect(result.authorizationUrl).toContain('oauth.zaloapp.com/v4/oa/permission');
    expect(result.authorizationUrl).toContain('code_challenge=');
    expect(result.state).toBeTruthy();
    expect(redisStore.size).toBe(1);
  });

  it('handles callback and saves tokens', async () => {
    const started = await service.startAuthorization('ten_dev_01', 'oa_sunrise_dev');
    const result = await service.handleCallback({
      code: 'auth_code_01',
      state: started.state,
      oa_id: 'oa_real_01',
    });

    expect(exchangeAuthorizationCode).toHaveBeenCalled();
    expect(saveOAuthTokens).toHaveBeenCalledWith(
      'ten_dev_01',
      'oa_real_01',
      expect.objectContaining({ accessToken: 'at_live' }),
    );
    expect(result.oaId).toBe('oa_real_01');
  });

  it('rejects expired OAuth state', async () => {
    await expect(
      service.handleCallback({ code: 'x', state: 'missing' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
