#!/usr/bin/env node
/**
 * Up/down proof for the price-window exclusion constraint on wereal_t02.
 * Reads the migration SQL, drops the constraint, inserts an overlap, then adds it back.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));

const databaseUrl = process.env.DATABASE_URL ?? '';
if (!databaseUrl) {
  console.error('FAIL DATABASE_URL is required');
  process.exit(1);
}
if (process.env.DB_SYNCHRONIZE === 'true') {
  console.error('FAIL DB_SYNCHRONIZE=true');
  process.exit(1);
}
if (/ngoinhahomnay|\/nnhn(\?|$)/.test(databaseUrl) || !databaseUrl.includes('wereal_t02')) {
  console.error('FAIL proof refused: database must be the isolated wereal_t02 database');
  process.exit(1);
}

const migrationPath = path.join(
  __dirname,
  '../apps/api/src/database/migrations/1758170000000-PriceWindowExclusion.ts',
);
const source = fs.readFileSync(migrationPath, 'utf8');

function methodSql(name) {
  const start = source.indexOf(`async ${name}(`);
  const end = source.indexOf('async ', start + 1);
  const body = source.slice(start, end === -1 ? source.length : end);
  const queries = [];
  const pattern = /queryRunner\.query\(`([\s\S]*?)`\)/g;
  let match = pattern.exec(body);
  while (match) {
    queries.push(match[1].trim());
    match = pattern.exec(body);
  }
  if (!queries.length) throw new Error(`migration ${name} has no SQL`);
  return queries;
}

const upSql = methodSql('up');
const downSql = methodSql('down');
const tenantId = 'ten_t06proof';
const projectId = 'prj_t06proof';

function fail(message) {
  throw new Error(message);
}

async function insertWindow(client, id, versionNo, from, to) {
  await client.query(
    `INSERT INTO price_book_versions
      (id, tenant_id, project_id, version_no, effective_from, effective_to, status, payload)
     VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', '{}')`,
    [id, tenantId, projectId, versionNo, from, to],
  );
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`SELECT set_config('app.is_platform_admin', 'true', false)`);
    const constraint = await client.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'excl_price_book_windows'`,
    );
    if (constraint.rowCount !== 1) fail('exclusion constraint is missing after migration:run');

    await client.query(
      `INSERT INTO tenants (id, name, type) VALUES ($1, 'T06 proof', 'DEVELOPER')
       ON CONFLICT (id) DO NOTHING`,
      [tenantId],
    );
    await client.query(
      `INSERT INTO projects (id, tenant_id, code, name) VALUES ($1, $2, 'T06', 'T06 proof')
       ON CONFLICT (id) DO NOTHING`,
      [projectId, tenantId],
    );

    await client.query('BEGIN');
    try {
      await insertWindow(client, 'pbv_t06_adj_a', 1, '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
      await insertWindow(client, 'pbv_t06_adj_b', 2, '2026-02-01T00:00:00Z', '2026-03-01T00:00:00Z');
    } catch (error) {
      fail(`adjacent windows were rejected: ${error.message}`);
    } finally {
      await client.query('ROLLBACK');
    }

    await client.query('BEGIN');
    let overlapRejected = false;
    try {
      await insertWindow(client, 'pbv_t06_over_a', 3, '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z');
      await insertWindow(client, 'pbv_t06_over_b', 4, '2026-02-01T00:00:00Z', '2026-04-01T00:00:00Z');
    } catch (error) {
      overlapRejected = error.code === '23P01';
      if (!overlapRejected) fail(`overlap failed with ${error.code ?? error.message}`);
    } finally {
      await client.query('ROLLBACK');
    }
    if (!overlapRejected) fail('overlapping windows were accepted while the constraint was up');

    try {
      for (const sql of downSql) await client.query(sql);
      const dropped = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conname = 'excl_price_book_windows'`,
      );
      if (dropped.rowCount !== 0) fail('down() left the exclusion constraint in place');

      await insertWindow(client, 'pbv_t06_down_a', 5, '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z');
      await insertWindow(client, 'pbv_t06_down_b', 6, '2026-02-01T00:00:00Z', '2026-04-01T00:00:00Z');
      await client.query(`DELETE FROM price_book_versions WHERE tenant_id = $1`, [tenantId]);

      for (const sql of upSql) await client.query(sql);
      const restored = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conname = 'excl_price_book_windows'`,
      );
      if (restored.rowCount !== 1) fail('up() did not restore the exclusion constraint');
    } finally {
      const still = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conname = 'excl_price_book_windows'`,
      );
      if (still.rowCount !== 1) {
        await client.query(`DELETE FROM price_book_versions WHERE tenant_id = $1`, [tenantId]);
        for (const sql of upSql) await client.query(sql);
      }
    }

    await client.query('BEGIN');
    let restoredRejects = false;
    try {
      await insertWindow(client, 'pbv_t06_re_a', 7, '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z');
      await insertWindow(client, 'pbv_t06_re_b', 8, '2026-06-01T00:00:00Z', '2026-08-01T00:00:00Z');
    } catch (error) {
      restoredRejects = error.code === '23P01';
    } finally {
      await client.query('ROLLBACK');
    }
    if (!restoredRejects) fail('overlap was accepted after the constraint was restored');
    console.log('PASS price window exclusion up/down');
  } finally {
    await client.query(`DELETE FROM price_book_versions WHERE tenant_id = $1`, [tenantId]).catch(() => undefined);
    await client.query(`DELETE FROM projects WHERE id = $1`, [projectId]).catch(() => undefined);
    await client.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]).catch(() => undefined);
    await client.end();
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
