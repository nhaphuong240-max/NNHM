import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { rlsStorage } from '../database/tenant-rls.service';
import { configuredCatalogToken, secretFromPublicToken, tenantIdFromPublicToken } from './public-tenant-token';

/** Exact match only. The client value is never concatenated into a LIKE pattern. */
export const PUBLIC_TOKEN_LOOKUP_SQL = `
  SELECT tenant_id FROM dsr_share_links
  WHERE token = $1 OR token = $2 OR ($2 <> '' AND split_part(token, '.', 1) = 'v1' AND split_part(token, '.', 3) = $2)
  UNION
  SELECT tenant_id FROM walk_in_galleries
  WHERE token = $1 OR token = $2 OR ($2 <> '' AND split_part(token, '.', 1) = 'v1' AND split_part(token, '.', 3) = $2)
  UNION
  SELECT tenant_id FROM open_day_rsvps
  WHERE qr_token = $1 OR qr_token = $2 OR ($2 <> '' AND split_part(qr_token, '.', 1) = 'v1' AND split_part(qr_token, '.', 3) = $2)
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
    runner.query(PUBLIC_TOKEN_LOOKUP_SQL, [raw, secret]),
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

/** Identifiers are fixed here. The caller value is only a bound parameter. */
const TENANT_LOOKUP_SQL = {
  project: 'SELECT DISTINCT tenant_id FROM projects WHERE id = $1',
  booking: 'SELECT DISTINCT tenant_id FROM bookings WHERE id = $1',
  payment_intent: 'SELECT DISTINCT tenant_id FROM payment_intents WHERE id = $1',
  bnpl_external: 'SELECT DISTINCT tenant_id FROM bnpl_applications WHERE external_id = $1',
  ekyc_external: 'SELECT DISTINCT tenant_id FROM kyc_profiles WHERE external_ref = $1',
  area_slug: 'SELECT DISTINCT tenant_id FROM geo_areas WHERE slug = $1',
  unit: 'SELECT DISTINCT tenant_id FROM units WHERE id = $1',
  contract: `SELECT DISTINCT tenant_id FROM audit_events WHERE entity_type = 'contract' AND entity_id = $1`,
  sso_provider: `
    SELECT DISTINCT tenant_id FROM tenant_config_versions
    WHERE domain = 'SSO_PROVIDER' AND entity_id = $1
    UNION
    SELECT DISTINCT tenant_id FROM audit_events
    WHERE entity_type = 'sso_provider' AND entity_id = $1
  `,
} as const;

export type PublicTenantLookup = keyof typeof TENANT_LOOKUP_SQL;

export async function lookupTenants(
  dataSource: DataSource,
  kind: PublicTenantLookup,
  value: string,
): Promise<string[]> {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const rows: Array<{ tenant_id: string }> = await withLookupConnection(dataSource, (runner) =>
    runner.query(TENANT_LOOKUP_SQL[kind], [trimmed]),
  );
  return [...new Set(rows.map((row) => row.tenant_id).filter(Boolean))];
}

export async function oneLookedUpTenant(
  dataSource: DataSource,
  kind: PublicTenantLookup,
  value: string | undefined,
  missing: 'not-found' | 'required',
): Promise<string> {
  const rows = await lookupTenants(dataSource, kind, value ?? '');
  if (rows.length > 1) {
    throw new UnprocessableEntityException({ detail: 'resource matches more than one tenant' });
  }
  if (rows.length === 1) return rows[0]!;
  if (missing === 'not-found') {
    throw new NotFoundException({ detail: 'resource not found' });
  }
  throw new UnprocessableEntityException({ detail: 'tenant is required' });
}

/** A presented public token, or a project id. Neither falls through to the seed tenant. */
export async function tenantFromTokenOrProject(
  dataSource: DataSource,
  token: string | undefined,
  projectId: string | undefined,
): Promise<string> {
  const presented = token?.trim() ?? '';
  if (presented) {
    const fromRows = await lookupTenantByPublicToken(dataSource, presented);
    if (fromRows.length > 1) {
      throw new UnprocessableEntityException({ detail: 'public token matches more than one tenant' });
    }
    const embedded = tenantIdFromPublicToken(presented);
    if (fromRows.length === 1) {
      if (embedded && embedded !== fromRows[0]) {
        throw new UnprocessableEntityException({
          detail: 'public token tenant does not match the stored row',
        });
      }
      return fromRows[0]!;
    }
    const catalog = configuredCatalogToken();
    if (catalog && presented === catalog && embedded) return embedded;
    throw new UnprocessableEntityException({ detail: 'public token does not carry a tenant' });
  }
  if (projectId?.trim()) {
    return oneLookedUpTenant(dataSource, 'project', projectId, 'required');
  }
  throw new UnprocessableEntityException({
    detail: 'anonymous request needs a public token or projectId',
  });
}

export async function recordUnscopedAudit(
  dataSource: DataSource,
  input: {
    tenantId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const tenantId = (input.tenantId ?? 'unbound').slice(0, 32);
  await withLookupConnection(dataSource, (runner) =>
    runner.query(
      `INSERT INTO audit_events (tenant_id, entity_type, entity_id, action, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        tenantId,
        input.entityType.slice(0, 64),
        input.entityId.slice(0, 64),
        input.action.slice(0, 32),
        JSON.stringify(input.payload),
      ],
    ),
  );
}
