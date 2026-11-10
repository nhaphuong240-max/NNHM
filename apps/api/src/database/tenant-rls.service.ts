import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';

const BIND_SQL = `
  SELECT set_config('app.current_tenant_id', $1, false),
         set_config('app.is_platform_admin', $2, false)
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
   * Every query on a checked-out connection sets the request GUC on that same client.
   * A separate dataSource.query would bind a random pool connection and then release it.
   */
  private bindPoolConnections() {
    const driver = this.dataSource.driver;
    if (!(driver instanceof PostgresDriver)) return;
    const pool = driver.master as PgPool & { __rlsPatched?: boolean };
    if (!pool?.connect || pool.__rlsPatched) return;
    pool.__rlsPatched = true;
    const connect = pool.connect.bind(pool);
    pool.connect = ((...args: unknown[]) => {
      const result = connect(...args);
      if (typeof args[0] === 'function') return result;
      return Promise.resolve(result).then((client) => {
        wrapClient(client as PgClient);
        return client;
      });
    }) as PgPool['connect'];
    this.logger.log('Postgres RLS context is bound on the connection that runs the query');
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
  client.query = ((...args: unknown[]) => {
    const first = args[0];
    const text = typeof first === 'string' ? first : (first as { text?: string } | null)?.text ?? '';
    if (text.includes('set_config') || text.includes('app.current_tenant_id')) {
      return original(...args);
    }
    const store = rlsStorage.getStore();
    const tenantId = store?.tenantId ?? '';
    const admin = store?.isPlatformAdmin ? 'true' : 'false';
    const last = args[args.length - 1];
    if (typeof last === 'function') {
      const callback = last as (err: Error | null, result?: unknown) => void;
      const rest = args.slice(0, -1);
      original(BIND_SQL, [tenantId, admin], (err: Error | null) => {
        if (err) {
          callback(err);
          return;
        }
        original(...rest, callback);
      });
      return undefined;
    }
    return Promise.resolve(original(BIND_SQL, [tenantId, admin])).then(() => original(...args));
  }) as PgClient['query'];
}

type PgClient = {
  query: (...args: unknown[]) => unknown;
  __rlsWrapped?: boolean;
};

type PgPool = {
  connect: (...args: unknown[]) => unknown;
};
