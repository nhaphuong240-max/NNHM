import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import { MetaGraphClient } from './meta-graph.client';
import { MetaLeadService } from './meta-lead.service';
import { MetaOAuthService } from './meta-oauth.service';

describe('MetaOAuthService', () => {
  let service: MetaOAuthService;
  const redisStore = new Map<string, string>();
  const exchangeAuthorizationCode = jest.fn();
  const listUserPages = jest.fn();
  const subscribePageLeadgen = jest.fn();
  const connectPage = jest.fn();

  beforeEach(async () => {
    redisStore.clear();
    exchangeAuthorizationCode.mockReset();
    listUserPages.mockReset();
    subscribePageLeadgen.mockReset();
    connectPage.mockReset();

    exchangeAuthorizationCode.mockResolvedValue({ accessToken: 'user_token_01' });
    listUserPages.mockResolvedValue([
      { id: 'page_01', name: 'Sunrise Page', accessToken: 'page_token_01' },
    ]);
    subscribePageLeadgen.mockResolvedValue({ success: true });
    connectPage.mockResolvedValue({ data: { pageId: 'page_01' } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaOAuthService,
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
        {
          provide: MetaGraphClient,
          useValue: {
            buildAuthorizationUrl: jest.fn(
              () => 'https://facebook.com/v21.0/dialog/oauth?client_id=app_123',
            ),
            exchangeAuthorizationCode,
            listUserPages,
            subscribePageLeadgen,
            isLiveMode: jest.fn(() => true),
          },
        },
        { provide: MetaLeadService, useValue: { connectPage } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'META_APP_ID') return 'app_123';
              if (key === 'META_OAUTH_REDIRECT_URI') {
                return 'http://localhost:3000/api/v1/integrations/meta/oauth/callback';
              }
              if (key === 'META_OAUTH_SUCCESS_URL') {
                return 'http://localhost:5174/admin/integrations/meta';
              }
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(MetaOAuthService);
  });

  it('starts OAuth with Facebook authorization URL', async () => {
    const result = await service.startAuthorization('ten_dev_01');
    expect(result.authorizationUrl).toContain('facebook.com');
    expect(result.state).toBeTruthy();
    expect(redisStore.size).toBe(1);
  });

  it('handles callback and connects pages', async () => {
    const started = await service.startAuthorization('ten_dev_01', 'usr_admin');
    const result = await service.handleCallback({ code: 'auth_code_01', state: started.state });

    expect(exchangeAuthorizationCode).toHaveBeenCalled();
    expect(listUserPages).toHaveBeenCalledWith('user_token_01');
    expect(connectPage).toHaveBeenCalledWith(
      'ten_dev_01',
      expect.objectContaining({ pageId: 'page_01', pageAccessToken: 'page_token_01' }),
      'usr_admin',
    );
    expect(subscribePageLeadgen).toHaveBeenCalledWith('page_01', 'page_token_01');
    expect(result.pages).toHaveLength(1);
  });

  it('rejects expired OAuth state', async () => {
    await expect(
      service.handleCallback({ code: 'x', state: 'missing' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
