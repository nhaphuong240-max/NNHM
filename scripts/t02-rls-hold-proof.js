#!/usr/bin/env node
/**
 * G01 and G02 on the isolated database.
 * The API Jest job connects as a superuser, so a green Jest run is not this proof.
 */
const crypto = require('crypto');
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

const password = crypto.randomBytes(18).toString('hex');
const adminUrl = new URL(databaseUrl);
const roleUrl = new URL(databaseUrl);
roleUrl.username = 't02_rls';
roleUrl.password = password;

function fail(message) {
  throw new Error(message);
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 't02_rls') THEN
          CREATE ROLE t02_rls NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN;
        END IF;
      END $$
    `);
    await admin.query(`ALTER ROLE t02_rls NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN PASSWORD '${password}'`);
    const role = await admin.query(`SELECT rolsuper FROM pg_roles WHERE rolname = 't02_rls'`);
    if (role.rows[0]?.rolsuper !== false) fail('t02_rls is not NOSUPERUSER');
    await admin.query('GRANT USAGE ON SCHEMA public TO t02_rls');
    await admin.query('GRANT SELECT, INSERT ON org_memberships TO t02_rls');
    await admin.query(`DELETE FROM org_memberships WHERE id = 'mem_t02_rls_a'`);
    await admin.query(
      `INSERT INTO org_memberships (id, tenant_id, user_id, org_id, role_code, status)
       VALUES ('mem_t02_rls_a', 'ten_rls_a', 'usr_rls_a', 'org_rls_a', 'SALES', 'ACTIVE')`,
    );

    const reader = new Client({ connectionString: roleUrl.toString() });
    await reader.connect();
    try {
      await reader.query(`SELECT set_config('app.current_tenant_id', 'ten_rls_b', false)`);
      await reader.query(`SELECT set_config('app.is_platform_admin', 'false', false)`);
      const seen = await reader.query('SELECT count(*)::int AS n FROM org_memberships');
      if (seen.rows[0].n !== 0) fail(`tenant B saw ${seen.rows[0].n} rows of tenant A`);
      let blocked = false;
      try {
        await reader.query(
          `INSERT INTO org_memberships (id, tenant_id, user_id, org_id, role_code, status)
           VALUES ('mem_t02_rls_b', 'ten_rls_a', 'usr_rls_b', 'org_rls_a', 'SALES', 'ACTIVE')`,
        );
      } catch (error) {
        blocked = /row-level security/i.test(error.message);
      }
      if (!blocked) fail('cross-tenant insert was not blocked by RLS');
      console.log('PASS G01 nosuperuser tenant B sees 0 and cannot write tenant A');
    } finally {
      await reader.end();
    }

    await admin.query(`DELETE FROM bookings WHERE unit_id = 'un_hold_proof'`);
    const attempts = 50;
    const results = await Promise.all(
      Array.from({ length: attempts }, (_, index) => {
        const client = new Client({ connectionString: adminUrl.toString() });
        const id = `bk_hold_${index.toString(16).padStart(4, '0')}`;
        const tenantId = index % 2 === 0 ? 'ten_hold_a' : 'ten_hold_b';
        return client
          .connect()
          .then(() =>
            client.query(
              `INSERT INTO bookings (
                 id, tenant_id, unit_id, unit_version, status, lock_id, lock_token, expires_at, currency
               ) VALUES ($1, $2, 'un_hold_proof', 1, 'RESERVED', $3, $4, now() + interval '1 hour', 'VND')`,
              [id, tenantId, `lock_${id}`, `tok_${id}`],
            ),
          )
          .then(() => 'ok')
          .catch((error) => error.code ?? 'error')
          .finally(() => client.end());
      }),
    );
    const wins = results.filter((item) => item === 'ok').length;
    const uniqueConflicts = results.filter((item) => item === '23505').length;
    if (wins !== 1 || uniqueConflicts !== attempts - 1) {
      fail(`concurrent hold wins=${wins} unique_conflicts=${uniqueConflicts} of ${attempts}`);
    }
    console.log(`PASS G02 ${attempts} concurrent inserts created one active hold`);
  } finally {
    await admin.query(`DELETE FROM org_memberships WHERE id IN ('mem_t02_rls_a', 'mem_t02_rls_b')`).catch(() => undefined);
    await admin.query(`DELETE FROM bookings WHERE unit_id = 'un_hold_proof'`).catch(() => undefined);
    await admin.end();
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message ?? error}`);
  process.exit(1);
});
