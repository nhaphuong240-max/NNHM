import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { currentRlsContext, TenantRlsService } from './tenant-rls.service';

type Recorded = { text: string; params?: unknown[] };

function sqlText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'text' in value) return String((value as { text?: string }).text ?? '');
  return '';
}

describe('TenantRlsService', () => {
  let service: TenantRlsService;
  const dataSourceQuery = jest.fn().mockResolvedValue(undefined);
  const recorded: Recorded[] = [];
  let poolReleaseCount = 0;

  type FakeClient = {
    query: (this: unknown, ...args: unknown[]) => unknown;
    release: jest.Mock;
  };

  const client: FakeClient = {
    query(this: unknown, ...args: unknown[]) {
      recorded.push({ text: sqlText(args[0]), params: Array.isArray(args[1]) ? (args[1] as unknown[]) : undefined });
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        (last as (err: Error | null, result?: unknown) => void)(null, { rows: [] });
        return undefined;
      }
      return Promise.resolve({ rows: [] });
    },
    release: jest.fn(async () => undefined),
  };

  const pool = {
    connect(arg: unknown) {
      if (typeof arg === 'function') {
        (arg as (err: null, checked: FakeClient, release: (err?: Error) => void) => void)(
          null,
          client,
          () => {
            poolReleaseCount += 1;
          },
        );
        return undefined;
      }
      return Promise.resolve(client);
    },
  };

  beforeEach(async () => {
    recorded.length = 0;
    poolReleaseCount = 0;
    client.release.mockClear();
    dataSourceQuery.mockClear();
    const module = await Test.createTestingModule({
      providers: [
        TenantRlsService,
        {
          provide: DataSource,
          useValue: {
            query: dataSourceQuery,
            driver: { master: pool },
          },
        },
      ],
    }).compile();

    service = module.get(TenantRlsService);
    service.onModuleInit();
  });

  function checkout(): Promise<{ query: (...args: unknown[]) => unknown; release: () => void }> {
    return new Promise((resolve, reject) => {
      pool.connect((err: Error | null, checked?: { query: (...args: unknown[]) => unknown }, release?: () => void) => {
        if (err || !checked || !release) {
          reject(err ?? new Error('no client'));
          return;
        }
        resolve({ query: checked.query.bind(checked), release });
      });
    });
  }

  it('does not bind the tenant on a random pooled query', async () => {
    await service.runAsTenant('ten_a', async () => {
      const checked = await checkout();
      await checked.query('SELECT id FROM org_memberships');
      checked.release();
      await new Promise((resolve) => setImmediate(resolve));
      expect(currentRlsContext()?.tenantId).toBe('ten_a');
    });
    expect(dataSourceQuery).not.toHaveBeenCalled();
    expect(recorded[0]).toEqual({
      text: expect.stringContaining("set_config('app.current_tenant_id'"),
      params: ['ten_a', 'false'],
    });
    expect(recorded[1]?.text).toBe('SELECT id FROM org_memberships');
    expect(recorded.some((row) => row.text.includes("set_config('app.current_tenant_id', '', false)"))).toBe(true);
    expect(poolReleaseCount).toBe(1);
  });

  it('runs callback as platform admin on the same async context', async () => {
    const result = await service.runAsPlatformAdmin(async () => {
      expect(currentRlsContext()).toEqual({ tenantId: '', isPlatformAdmin: true });
      const checked = await checkout();
      await checked.query('SELECT 1');
      checked.release();
      await new Promise((resolve) => setImmediate(resolve));
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(dataSourceQuery).not.toHaveBeenCalled();
    const bind = recorded.find((row) => row.params?.[1] === 'true');
    expect(bind?.params).toEqual(['', 'true']);
  });

  it('sets the tenant on the callback connection and clears it before reuse', async () => {
    await service.runAsTenant('ten_a', async () => {
      const checked = await checkout();
      await new Promise<void>((resolve, reject) => {
        checked.query('SELECT a', (err: Error | null) => (err ? reject(err) : resolve()));
      });
      checked.release();
      await new Promise((resolve) => setImmediate(resolve));
    });

    await service.runAsTenant('ten_b', async () => {
      const checked = await checkout();
      await checked.query('SELECT b');
      checked.release();
      await new Promise((resolve) => setImmediate(resolve));
    });

    const tenantBinds = recorded.filter((row) => row.params?.[0] === 'ten_a' || row.params?.[0] === 'ten_b');
    expect(tenantBinds.map((row) => row.params)).toEqual([
      ['ten_a', 'false'],
      ['ten_b', 'false'],
    ]);
    const resets = recorded.filter((row) => row.text.includes("set_config('app.current_tenant_id', '', false)"));
    expect(resets).toHaveLength(2);
    expect(poolReleaseCount).toBe(2);
    expect(recorded.findIndex((row) => row.params?.[0] === 'ten_b')).toBeGreaterThan(
      recorded.findIndex((row) => row.text.includes("set_config('app.current_tenant_id', '', false)")),
    );
  });
});
