#!/usr/bin/env node
/**
 * G01 through the app pool wrapper. This script does not call set_config.
 * The API Jest job has no Postgres, so CI runs this from t02-isolated-db.
 */
const crypto = require('crypto');
const path = require('path');

const apiRoot = path.join(__dirname, '../apps/api');
process.env.TS_NODE_PROJECT = path.join(apiRoot, 'tsconfig.json');
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
require(path.join(apiRoot, 'node_modules/ts-node/register'));

const { Client } = require(path.join(apiRoot, 'node_modules/pg'));
const { DataSource } = require(path.join(apiRoot, 'node_modules/typeorm'));
const { TenantRlsService } = require(path.join(apiRoot, 'src/database/tenant-rls.service.ts'));
const { OrgMembershipEntity } = require(path.join(apiRoot, 'src/database/entities/org-memberships.entity.ts'));

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
  let dataSource;
  try {
    await admin.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 't02_rls') THEN
          CREATE ROLE t02_rls NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN;
        END IF;
      END $$
    `);
    await admin.query(
      `ALTER ROLE t02_rls NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN PASSWORD '${password}'`,
    );
    const role = await admin.query(`SELECT rolsuper FROM pg_roles WHERE rolname = 't02_rls'`);
    if (role.rows[0]?.rolsuper !== false) fail('t02_rls is not NOSUPERUSER');
    await admin.query('GRANT USAGE ON SCHEMA public TO t02_rls');
    await admin.query('GRANT SELECT, INSERT ON org_memberships TO t02_rls');
    await admin.query(`DELETE FROM org_memberships WHERE id IN ('mem_t02_app_a', 'mem_t02_app_b', 'mem_t02_app_x')`);
    await admin.query(
      `INSERT INTO org_memberships (id, tenant_id, user_id, org_id, role_code, status)
       VALUES
         ('mem_t02_app_a', 'ten_rls_app_a', 'usr_app_a', 'org_app_a', 'SALES', 'ACTIVE'),
         ('mem_t02_app_b', 'ten_rls_app_b', 'usr_app_b', 'org_app_b', 'SALES', 'ACTIVE')`,
    );

    dataSource = new DataSource({
      type: 'postgres',
      url: roleUrl.toString(),
      entities: [OrgMembershipEntity],
      synchronize: false,
      logging: false,
      extra: { max: 1 },
    });
    await dataSource.initialize();
    const service = new TenantRlsService(dataSource);
    service.onModuleInit();
    const repo = dataSource.getRepository(OrgMembershipEntity);

    const who = await service.runAsTenant('ten_rls_app_a', () =>
      dataSource.query(`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`),
    );
    if (who[0]?.rolsuper !== false) fail('app connection is not NOSUPERUSER');

    const seenA = await service.runAsTenant('ten_rls_app_a', () => repo.find());
    const idsA = seenA.map((row) => row.id).sort();
    if (idsA.includes('mem_t02_app_b')) fail('tenant A repository saw tenant B');
    if (!idsA.includes('mem_t02_app_a')) fail('tenant A repository did not see its own row');

    const seenB = await service.runAsTenant('ten_rls_app_b', () => repo.find());
    const idsB = seenB.map((row) => row.id).sort();
    if (idsB.includes('mem_t02_app_a')) fail('the next request on the same pooled client saw tenant A');
    if (!idsB.includes('mem_t02_app_b')) fail('tenant B repository did not see its own row');

    let blocked = false;
    try {
      await service.runAsTenant('ten_rls_app_a', () =>
        repo.insert({
          id: 'mem_t02_app_x',
          tenantId: 'ten_rls_app_b',
          userId: 'usr_app_x',
          orgId: 'org_app_x',
          roleCode: 'SALES',
          status: 'ACTIVE',
          payload: {},
        }),
      );
    } catch (error) {
      blocked = /row-level security/i.test(String(error && error.message ? error.message : error));
    }
    if (!blocked) fail('repository insert into another tenant was not blocked');
    console.log('PASS app NOSUPERUSER repository isolates tenants on one pooled client');
  } finally {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await admin.query(`DELETE FROM org_memberships WHERE id IN ('mem_t02_app_a', 'mem_t02_app_b', 'mem_t02_app_x')`);
    await admin.end();
  }
}

main().catch((error) => {
  console.error(`FAIL ${error && error.message ? error.message : error}`);
  process.exit(1);
});
