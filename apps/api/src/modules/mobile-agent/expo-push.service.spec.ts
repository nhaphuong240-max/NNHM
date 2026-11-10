import { ConfigService } from '@nestjs/config';
import { RailResolverService } from '../tenant-config/rail-resolver.service';
import { ExpoPushService } from './expo-push.service';

function rails(pushLiveEnabled: boolean): RailResolverService {
  return {
    resolve: jest.fn().mockResolvedValue({ pushLiveEnabled }),
  } as unknown as RailResolverService;
}

describe('ExpoPushService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns empty tickets for empty batch', async () => {
    const svc = new ExpoPushService({ get: () => 'false' } as unknown as ConfigService, rails(false));
    await expect(svc.sendBatch([])).resolves.toEqual([]);
  });

  it('skips network when live disabled is checked separately', async () => {
    const svc = new ExpoPushService({ get: () => 'false' } as unknown as ConfigService, rails(false));
    await expect(svc.isLiveEnabled('ten_dev_01')).resolves.toBe(false);
  });

  it('posts to Expo when live enabled', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }),
    }) as unknown as typeof fetch;

    const svc = new ExpoPushService(
      {
        get: (key: string) => (key === 'PUSH_LIVE_ENABLED' ? 'true' : undefined),
      } as unknown as ConfigService,
      rails(true),
    );

    await expect(svc.isLiveEnabled('ten_dev_01')).resolves.toBe(true);
    const tickets = await svc.sendBatch([
      { to: 'ExponentPushToken[x]', title: 'Hi', body: 'Test' },
    ]);
    expect(tickets[0]?.status).toBe('ok');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
