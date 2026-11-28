import { ScheduleLeaderService } from './schedule-leader.service';

describe('ScheduleLeaderService', () => {
  const store = new Map<string, { value: string; ttl: number }>();
  const redis = {
    set: jest.fn(async (key: string, value: string, _ex: string, ttl: number, nx?: string) => {
      if (nx === 'NX' && store.has(key)) return null;
      store.set(key, { value, ttl });
      return 'OK';
    }),
    get: jest.fn(async (key: string) => store.get(key)?.value ?? null),
    expire: jest.fn(async (key: string, ttl: number) => {
      const row = store.get(key);
      if (!row) return 0;
      row.ttl = ttl;
      return 1;
    }),
  };

  const config = { get: jest.fn(() => 'true') };
  const service = new ScheduleLeaderService(redis as never, config as never);

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
    config.get.mockReturnValue('true');
  });

  it('skips the tick when Redis throws', async () => {
    redis.set.mockRejectedValueOnce(new Error('redis down'));
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    await expect(service.isLeader('esign-vault-retry', 120)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skipping tick'));
  });

  it('renews TTL when this pod already holds the lock', async () => {
    process.env.HOSTNAME = 'pod-a';
    await service.isLeader('esign-vault-retry', 30);
    expect(store.get('wereal:schedule:leader:esign-vault-retry')?.ttl).toBe(30);
    await expect(service.isLeader('esign-vault-retry', 180)).resolves.toBe(true);
    expect(redis.expire).toHaveBeenCalledWith('wereal:schedule:leader:esign-vault-retry', 180);
    expect(store.get('wereal:schedule:leader:esign-vault-retry')?.ttl).toBe(180);
    await expect(service.renewLeader('esign-vault-retry', 240)).resolves.toBe(true);
    expect(store.get('wereal:schedule:leader:esign-vault-retry')?.ttl).toBe(240);
  });

  it('does not steal another pod lock', async () => {
    store.set('wereal:schedule:leader:esign-vault-retry', { value: 'other-pod', ttl: 50 });
    process.env.HOSTNAME = 'pod-a';
    await expect(service.isLeader('esign-vault-retry', 120)).resolves.toBe(false);
    await expect(service.renewLeader('esign-vault-retry', 120)).resolves.toBe(false);
  });
});
