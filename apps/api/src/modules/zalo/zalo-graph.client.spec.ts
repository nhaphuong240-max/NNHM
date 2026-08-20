import { ConfigService } from '@nestjs/config';
import { ZaloGraphApiError, ZaloGraphClient } from './zalo-graph.client';

describe('ZaloGraphClient', () => {
  const fetchMock = jest.fn();
  let client: ZaloGraphClient;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;

    client = new ZaloGraphClient({
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'ZALO_APP_ID') return 'app_123';
        if (key === 'ZALO_OA_SECRET') return 'secret_abc';
        return fallback;
      }),
    } as unknown as ConfigService);
  });

  it('refreshes OA access token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'at_new',
        refresh_token: 'rt_new',
        expires_in: '3600',
      }),
    });

    const result = await client.refreshAccessToken('rt_old');
    expect(result.accessToken).toBe('at_new');
    expect(result.refreshToken).toBe('rt_new');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('oauth.zaloapp.com'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on OAuth error', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: -216, message: 'Invalid refresh token' }),
    });

    await expect(client.refreshAccessToken('bad')).rejects.toBeInstanceOf(ZaloGraphApiError);
  });

  it('exchanges authorization code with PKCE verifier', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'at_code',
        refresh_token: 'rt_code',
        expires_in: '3600',
      }),
    });

    const result = await client.exchangeAuthorizationCode('auth_code', 'verifier_abc');
    expect(result.accessToken).toBe('at_code');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain('grant_type=authorization_code');
    expect(String(init.body)).toContain('code_verifier=verifier_abc');
  });

  it('sends ZNS template via Graph API', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        error: 0,
        message: 'Success',
        data: { msg_id: 'zns_msg_01', sent_time: '123' },
      }),
    });

    const result = await client.sendZnsTemplate({
      accessToken: 'at_live',
      phone: '+84901234567',
      templateId: 'zns_lead_ack_v1',
      templateData: { customer_name: 'A' },
      trackingId: 'trk_01',
    });

    expect(result.msgId).toBe('zns_msg_01');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ access_token: 'at_live' });
    expect(JSON.parse(String(init.body))).toMatchObject({
      phone: '84901234567',
      template_id: 'zns_lead_ack_v1',
    });
  });
});
