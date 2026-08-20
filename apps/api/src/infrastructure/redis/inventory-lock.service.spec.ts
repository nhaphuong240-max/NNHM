import { InventoryLockService } from './inventory-lock.service';

describe('InventoryLockService', () => {
  const store = new Map<string, { value: string; ttl?: number }>();
  const counters = new Map<string, string>();

  const redis = {
    set: jest.fn(async (key: string, value: string, ...args: string[]) => {
      const nx = args.includes('NX');
      if (nx && store.has(key)) return null;
      store.set(key, { value });
      return nx ? 'OK' : 'OK';
    }),
    get: jest.fn(async (key: string) => store.get(key)?.value ?? counters.get(key) ?? null),
    incr: jest.fn(async (key: string) => {
      const next = Number(counters.get(key) ?? 0) + 1;
      counters.set(key, String(next));
      return next;
    }),
    scan: jest.fn(async (_cursor: string, _matchKw: string, pattern: string) => {
      const keys = [...store.keys()].filter((key) => {
        const prefix = pattern.replace('*', '');
        return key.startsWith(prefix);
      });
      return ['0', keys];
    }),
    ttl: jest.fn(async (key: string) => (store.has(key) ? 40 : -2)),
    eval: jest.fn(async (_script: string, _n: number, key: string, expected: string) => {
      const entry = store.get(key);
      if (entry?.value === expected) {
        store.delete(key);
        return 1;
      }
      return 0;
    }),
  };

  const service = new InventoryLockService(redis as never);

  beforeEach(() => {
    store.clear();
    counters.clear();
    jest.clearAllMocks();
  });

  it('acquireLock sets NX key with bookingId|token', async () => {
    const token = await service.acquireLock('ten_dev_01', 'un_01', 'bk_01', 3600);
    expect(token).toBeTruthy();
    const holder = await service.getHolder('ten_dev_01', 'un_01');
    expect(holder?.bookingId).toBe('bk_01');
    expect(holder?.lockToken).toBe(token);
  });

  it('second acquireLock on same unit returns null', async () => {
    await service.acquireLock('ten_dev_01', 'un_01', 'bk_01', 3600);
    const second = await service.acquireLock('ten_dev_01', 'un_01', 'bk_02', 3600);
    expect(second).toBeNull();
  });

  it('logs contention metrics when lock is held (P3-S2)', async () => {
    const warnSpy = jest.spyOn(service['logger'], 'warn');
    await service.acquireLock('ten_dev_01', 'un_04', 'bk_win', 3600);
    await service.acquireLock('ten_dev_01', 'un_04', 'bk_lose', 3600);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('inventory_lock contention tenant=ten_dev_01 unit=un_04 attempted=bk_lose holder=bk_win'),
    );

    const metrics = await service.getMetrics('ten_dev_01');
    expect(metrics.acquired).toBe(1);
    expect(metrics.contention).toBe(1);
  });

  it('releaseLock deletes only matching token', async () => {
    const token = await service.acquireLock('ten_dev_01', 'un_01', 'bk_01', 3600);
    expect(await service.releaseLock('ten_dev_01', 'un_01', token!)).toBe(true);
    expect(await service.getHolder('ten_dev_01', 'un_01')).toBeNull();
    expect(await service.releaseLock('ten_dev_01', 'un_01', token!)).toBe(false);
  });

  it('listActiveLocks returns unit + TTL (OPS-S3)', async () => {
    await service.acquireLock('ten_dev_01', 'un_09', 'bk_ttl', 120);
    const locks = await service.listActiveLocks('ten_dev_01');
    expect(locks).toEqual([{ unitId: 'un_09', bookingId: 'bk_ttl', ttlSeconds: 40 }]);
  });
});
