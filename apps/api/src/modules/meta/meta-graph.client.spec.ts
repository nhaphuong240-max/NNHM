import { ConfigService } from '@nestjs/config';
import { MetaGraphClient } from './meta-graph.client';

describe('MetaGraphClient', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'META_GRAPH_SANDBOX') return 'false';
      return fallback;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('fetchLead returns field_data from Graph API', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 'lg_123',
        field_data: [{ name: 'full_name', values: ['Meta Buyer'] }],
      }),
    })) as unknown as typeof fetch;

    const client = new MetaGraphClient(config);
    const result = await client.fetchLead('lg_123', 'page_token_dev');
    expect(result.field_data?.[0]?.values[0]).toBe('Meta Buyer');
  });

  it('fetchLead throws on Graph error', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid OAuth access token', code: 190 } }),
    })) as unknown as typeof fetch;

    const client = new MetaGraphClient(config);
    await expect(client.fetchLead('lg_bad', 'bad_token')).rejects.toThrow('Invalid OAuth');
  });
});
