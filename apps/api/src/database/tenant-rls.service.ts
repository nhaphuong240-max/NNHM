import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const BIND_SQL = `
  SELECT set_config('app.current_tenant_id', $1, false),
         set_config('app.is_platform_admin', $2, false)
`;
const RESET_SQL = `
  SELECT set_config('app.current_tenant_id', '', false),
         set_config('app.is_platform_admin', 'false', false)
`;

export type RlsRequestContext = { tenantId: string; isPlatformAdmin: boolean };

export const rlsStorage = new AsyncLocalStorage<RlsRequestContext>();

export function currentRlsContext(): RlsRequestContext | null {
  return rlsStorage.getStore() ?? null;
}

@Injectable()
export class TenantRlsService implements OnModuleInit {
  private readonly logger = new Logger(TenantRlsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit() {
    this.bindPoolConnections();
  }

  /**
   * TypeORM checks out with pool.connect(callback) (PostgresDriver.obtainMasterConnection).
   * The promise form is wrapped too. set_config runs on that client, and release clears it
   * before the client returns to the pool. dataSource.query is not used.
   */
  private bindPoolConnections() {
    const driver = this.dataSource.driver as { master?: PgPool; slaves?: PgPool[] };
    const pools = [driver?.master, ...(driver?.slaves ?? [])].filter(
      (pool): pool is PgPool => Boolean(pool?.connect),
    );
    for (const pool of pools) this.patchPool(pool);
    if (pools.length) {
      this.logger.log('Postgres RLS context is bound on the connection that runs the query');
    }
  }

  private patchPool(pool: PgPool) {
    if (pool.__rlsPatched) return;
    pool.__rlsPatched = true;
    const connect = pool.connect.bind(pool);
    pool.connect = ((...args: unknown[]) => {
      if (typeof args[0] === 'function') {
        const callback = args[0] as PoolCallback;
        return connect((err: Error | null, client?: PgClient, release?: (releaseErr?: Error) => void) => {
          if (err || !client || !release) {
            callback(err ?? new Error('postgres pool returned no client'), client, release);
            return;
          }
          wrapClient(client);
          let released = false;
          const releaseOnce = (releaseErr?: Error) => {
            if (released) return;
            released = true;
            resetClient(client).then(
              () => release(releaseErr),
              (resetErr) => release(resetErr),
            );
          };
          callback(null, client, releaseOnce);
        });
      }
      return Promise.resolve(connect(...args)).then((client) => {
        const pgClient = client as PgClient;
        wrapClient(pgClient);
        wrapRelease(pgClient);
        return pgClient;
      });
    }) as PgPool['connect'];
  }

  runWithContext<T>(context: RlsRequestContext, fn: () => T): T {
    return rlsStorage.run(context, fn);
  }

  async runAsPlatformAdmin<T>(fn: () => Promise<T>): Promise<T> {
    return rlsStorage.run({ tenantId: '', isPlatformAdmin: true }, fn);
  }

  async runAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return rlsStorage.run({ tenantId, isPlatformAdmin: false }, fn);
  }
}

function wrapClient(client: PgClient) {
  if (client.__rlsWrapped) return;
  client.__rlsWrapped = true;
  const original = client.query.bind(client);
  client.__rlsOriginalQuery = original;
  client.query = ((...args: unknown[]) => {
    const first = args[0];
    const text = typeof first === 'string' ? first : (first as { text?: string } | null)?.text ?? '';
    if (isTxnControl(text)) {
      client.__rlsBound = undefined;
      return original(...args);
    }
    if (text.includes('set_config') || text.includes('app.current_tenant_id')) {
      return original(...args);
    }
    const store = rlsStorage.getStore();
    const tenantId = store?.tenantId ?? '';
    const admin = store?.isPlatformAdmin ? 'true' : 'false';
    if (client.__rlsBound?.tenantId === tenantId && client.__rlsBound?.admin === admin) {
      return original(...args);
    }
    const last = args[args.length - 1];
    if (typeof last === 'function') {
      const callback = last as (err: Error | null, result?: unknown) => void;
      const rest = args.slice(0, -1);
      original(BIND_SQL, [tenantId, admin], (err: Error | null) => {
        if (err) {
          callback(err);
          return;
        }
        client.__rlsBound = { tenantId, admin };
        original(...rest, callback);
      });
      return undefined;
    }
    return Promise.resolve(original(BIND_SQL, [tenantId, admin])).then(() => {
      client.__rlsBound = { tenantId, admin };
      return original(...args);
    });
  }) as PgClient['query'];
}

/**
 * pg-pool assigns a new client.release on every promise checkout.
 * Wrap that function each time. A once-only flag would skip RESET on the next checkout.
 */
function wrapRelease(client: PgClient) {
  if (!client.release || client.release === client.__wrappedRelease) return;
  const originalRelease = client.release.bind(client);
  const wrapped = (err?: Error) => resetClient(client).then(() => originalRelease(err));
  client.__wrappedRelease = wrapped;
  client.release = wrapped;
}

function resetClient(client: PgClient): Promise<void> {
  client.__rlsBound = undefined;
  const original = client.__rlsOriginalQuery ?? client.query.bind(client);
  return Promise.resolve(original(RESET_SQL)).then(() => undefined);
}

function isTxnControl(sql: string): boolean {
  const text = stripLeadingComments(sql).replace(/;+\s*$/, '').replace(/\s+/g, ' ').toUpperCase();
  return (
    text === 'BEGIN' ||
    text.startsWith('BEGIN ') ||
    text === 'START TRANSACTION' ||
    text.startsWith('START TRANSACTION ') ||
    text === 'COMMIT' ||
    text.startsWith('COMMIT ') ||
    text === 'END' ||
    text.startsWith('END ') ||
    text === 'ROLLBACK' ||
    text.startsWith('ROLLBACK ') ||
    text === 'ABORT' ||
    text.startsWith('ABORT ') ||
    text.startsWith('SAVEPOINT ') ||
    text.startsWith('RELEASE SAVEPOINT ') ||
    text.startsWith('SET TRANSACTION ')
  );
}

function stripLeadingComments(sql: string): string {
  let text = sql.trim();
  while (text.length) {
    if (text.startsWith('--')) {
      const newline = text.indexOf('\n');
      text = (newline === -1 ? '' : text.slice(newline + 1)).trim();
      continue;
    }
    if (text.startsWith('/*')) {
      const end = text.indexOf('*/');
      if (end === -1) break;
      text = text.slice(end + 2).trim();
      continue;
    }
    break;
  }
  return text;
}

type PoolCallback = (
  err: Error | null,
  client?: PgClient,
  release?: (releaseErr?: Error) => void,
) => void;

type PgClient = {
  query: (...args: unknown[]) => unknown;
  release?: (err?: Error) => unknown;
  __rlsWrapped?: boolean;
  __wrappedRelease?: (err?: Error) => unknown;
  __rlsBound?: { tenantId: string; admin: string };
  __rlsOriginalQuery?: (...args: unknown[]) => unknown;
};

type PgPool = {
  connect: (...args: unknown[]) => unknown;
  __rlsPatched?: boolean;
};
