import { DataSource, QueryRunner } from 'typeorm';
import { rlsStorage } from '../database/tenant-rls.service';
import { secretFromPublicToken } from './public-tenant-token';

const TOKEN_LOOKUP = `
  SELECT tenant_id FROM dsr_share_links
  WHERE token = $1 OR token = $2 OR ($2 <> '' AND token LIKE 'v1.%.' || $2)
  UNION
  SELECT tenant_id FROM walk_in_galleries
  WHERE token = $1 OR token = $2 OR ($2 <> '' AND token LIKE 'v1.%.' || $2)
  UNION
  SELECT tenant_id FROM open_day_rsvps
  WHERE qr_token = $1 OR qr_token = $2 OR ($2 <> '' AND qr_token LIKE 'v1.%.' || $2)
  UNION
  SELECT tenant_id FROM seeker_otp_challenges
  WHERE id = $1 OR id = $2
`;

/** One connection for the lookup. The admin flag lives only inside this async context. */
export async function withLookupConnection<T>(
  dataSource: DataSource,
  fn: (runner: QueryRunner) => Promise<T>,
): Promise<T> {
  return rlsStorage.run({ tenantId: '', isPlatformAdmin: true }, async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      return await fn(runner);
    } finally {
      await runner.release();
    }
  });
}

export async function lookupTenantByPublicToken(
  dataSource: DataSource,
  presented: string,
): Promise<string[]> {
  const raw = presented.trim();
  const secret = secretFromPublicToken(raw) ?? (raw.startsWith('v1.') ? '' : raw);
  const rows: Array<{ tenant_id: string }> = await withLookupConnection(dataSource, (runner) =>
    runner.query(TOKEN_LOOKUP, [raw, secret]),
  );
  return [...new Set(rows.map((row) => row.tenant_id).filter(Boolean))];
}

export async function lookupTenantByResource(
  dataSource: DataSource,
  table: 'projects' | 'open_day_events',
  id: string,
): Promise<string | null> {
  const rows: Array<{ tenant_id: string }> = await withLookupConnection(dataSource, (runner) =>
    runner.query(`SELECT tenant_id FROM "${table}" WHERE id = $1`, [id]),
  );
  return rows[0]?.tenant_id ?? null;
}
