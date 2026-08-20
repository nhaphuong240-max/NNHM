import { ConfigService } from '@nestjs/config';
import { ExpoPushService } from './expo-push.service';

describe('ExpoPushService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns empty tickets for empty batch', async () => {
    const svc = new ExpoPushService({ get: () => 'false' } as unknown as ConfigService);
    await expect(svc.sendBatch([])).resolves.toEqual([]);
  });

  it('skips network when live disabled is checked separately', () => {
    const svc = new ExpoPushService({ get: () => 'false' } as unknown as ConfigService);
    expect(svc.isLiveEnabled()).toBe(false);
  });

  it('posts to Expo when live enabled', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }),
    }) as unknown as typeof fetch;

    const svc = new ExpoPushService({
      get: (key: string) => (key === 'PUSH_LIVE_ENABLED' ? 'true' : undefined),
    } as unknown as ConfigService);

    expect(svc.isLiveEnabled()).toBe(true);
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
