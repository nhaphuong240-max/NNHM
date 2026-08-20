import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';

const RESET_SQL = `
  SELECT set_config('app.current_tenant_id', '', false),
         set_config('app.is_platform_admin', 'false', false)
`;

const BIND_SQL = `
  SELECT set_config('app.current_tenant_id', $1, false),
         set_config('app.is_platform_admin', $2, false)
`;

@Injectable()
export class TenantRlsService implements OnModuleInit {
  private readonly logger = new Logger(TenantRlsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit() {
    this.registerPoolResetHook();
  }

  /** Reset session vars when a pooled connection is checked out (ADR-002). */
  private registerPoolResetHook() {
    const driver = this.dataSource.driver;
    if (!(driver instanceof PostgresDriver)) return;

    const pool = driver.master as { on?: (event: string, cb: (client: PgPoolClient) => void) => void };
    if (!pool?.on) return;

    pool.on('acquire', (client) => {
      void client.query(RESET_SQL).catch((err: Error) => {
        this.logger.warn(`RLS pool reset failed: ${err.message}`);
      });
    });
    this.logger.log('Postgres RLS pool acquire reset registered');
  }

  async bindRequestContext(tenantId: string | null | undefined, isPlatformAdmin: boolean) {
    await this.dataSource.query(BIND_SQL, [
      tenantId?.trim() ?? '',
      isPlatformAdmin ? 'true' : 'false',
    ]);
  }

  async clearRequestContext() {
    await this.dataSource.query(RESET_SQL);
  }

  async runAsPlatformAdmin<T>(fn: () => Promise<T>): Promise<T> {
    await this.bindRequestContext(null, true);
    try {
      return await fn();
    } finally {
      await this.clearRequestContext();
    }
  }

  async runAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    await this.bindRequestContext(tenantId, false);
    try {
      return await fn();
    } finally {
      await this.clearRequestContext();
    }
  }
}

type PgPoolClient = { query: (sql: string, params?: unknown[]) => Promise<unknown> };
