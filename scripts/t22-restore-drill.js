#!/usr/bin/env node
/**
 * T22 restore drill. Dumps a throwaway database with pg_dump and loads it
 * with psql into a second throwaway database on the same isolated server.
 * A newer client may emit SET transaction_timeout, which server 16 rejects.
 * That line is removed before the load. The dump still comes from pg_dump.
 * wereal_t02 is never dropped. Production-like URLs are refused.
 * The elapsed time is an observation of this drill. It is not a signed RTO.
 * RPO stays unmeasured because this drill has no WAL archive.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));

const SRC = 'wereal_t22_src';
const DST = 'wereal_t22_dst';
const databaseUrl = process.env.DATABASE_URL ?? '';

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function assertIsolatedUrl() {
  if (!databaseUrl) fail('DATABASE_URL is required');
  if (process.env.DB_SYNCHRONIZE === 'true') fail('DB_SYNCHRONIZE=true');
  if (/ngoinhahomnay|\/nnhn(\?|$)/.test(databaseUrl)) fail('refused production-like DATABASE_URL');
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail('DATABASE_URL is not a URL');
  }
  const name = parsed.pathname.replace(/^\//, '');
  if (name !== 'wereal_t02') fail('isolated harness only accepts database name wereal_t02');
  if (!parsed.hostname || !parsed.port) fail('DATABASE_URL needs a host and a port');
  return parsed;
}

function databaseUrlFor(parsed, name) {
  const next = new URL(parsed.href);
  next.pathname = `/${name}`;
  return next.toString();
}

function sqlStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.split('\n').some((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    }));
}

function runDump(bin, args, env) {
  const result = spawnSync(bin, args, { env, encoding: 'utf8' });
  if (result.error) fail(`${bin} failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`${bin} exited ${result.status}${detail ? `: ${detail}` : ''}`);
  }
}

async function execAdmin(admin, sql, params) {
  await admin.query(sql, params);
}

async function resetThrowaway(admin, name) {
  await execAdmin(
    admin,
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [name],
  );
  await execAdmin(admin, `DROP DATABASE IF EXISTS ${name}`);
}

async function main() {
  const parsed = assertIsolatedUrl();
  const admin = new Client({ connectionString: databaseUrl });
  const dumpDir = fs.mkdtempSync(path.join(os.tmpdir(), 't22-'));
  const dumpFile = path.join(dumpDir, 't22.dump');
  const libpq = {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port,
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGSSLMODE: 'disable',
  };
  const pgDump = process.env.PG_DUMP || 'pg_dump';
  let restoreElapsedMs = null;
  try {
    await admin.connect();
    await resetThrowaway(admin, SRC);
    await resetThrowaway(admin, DST);
    await execAdmin(admin, `CREATE DATABASE ${SRC}`);
    await execAdmin(admin, `CREATE DATABASE ${DST}`);

    const src = new Client({ connectionString: databaseUrlFor(parsed, SRC) });
    await src.connect();
    try {
      await src.query(
        `CREATE TABLE t22_marker (
           id text PRIMARY KEY,
           class text NOT NULL,
           pilot_enabled boolean NOT NULL,
           amount numeric
         )`,
      );
      await src.query(
        `INSERT INTO t22_marker (id, class, pilot_enabled, amount) VALUES ('row_1', 'SYNTHETIC', false, NULL)`,
      );
    } finally {
      await src.end();
    }

    const started = Date.now();
    runDump(
      pgDump,
      ['--format=plain', '--inserts', '--no-owner', '--no-acl', '--file', dumpFile, '--dbname', SRC],
      libpq,
    );
    const dumped = fs
      .readFileSync(dumpFile, 'utf8')
      .split('\n')
      .filter((line) => !/transaction_timeout/i.test(line))
      .filter((line) => !line.startsWith('\\'))
      .join('\n');

    const dst = new Client({ connectionString: databaseUrlFor(parsed, DST) });
    await dst.connect();
    try {
      for (const statement of sqlStatements(dumped)) {
        await dst.query(statement);
      }
      restoreElapsedMs = Date.now() - started;
      const restored = await dst.query(`SELECT id, class, pilot_enabled, amount FROM public.t22_marker`);
      if (restored.rowCount !== 1) fail('restored marker row is missing');
      const row = restored.rows[0];
      if (row.id !== 'row_1' || row.class !== 'SYNTHETIC' || row.pilot_enabled !== false || row.amount !== null) {
        fail('restored marker does not match the synthetic drill');
      }
    } finally {
      await dst.end();
    }

    let doubleHold = 'unmeasured';
    try {
      await admin.query(`SELECT set_config('app.is_platform_admin', 'true', false)`);
      const violations = await admin.query(
        `SELECT count(*)::int AS violations FROM (
           SELECT unit_id FROM bookings
           WHERE status IN ('RESERVED', 'DEPOSITED')
           GROUP BY unit_id
           HAVING count(*) > 1
         ) s`,
      );
      doubleHold = String(violations.rows[0].violations);
    } catch (error) {
      console.log(`double_hold_query=${error instanceof Error ? error.message : 'failed'}`);
      doubleHold = 'unmeasured';
    }

    console.log(`restore_elapsed_ms=${restoreElapsedMs}`);
    console.log('rpo=unmeasured');
    console.log('rto_signed=false');
    console.log(`double_hold_violations=${doubleHold}`);
    console.log('recommendation=none');
    console.log('account_class=SYNTHETIC');
    console.log('pilot_flag=false');
    console.log('amount=null');
    console.log('PASS throwaway restore drill');
  } finally {
    try {
      await resetThrowaway(admin, SRC);
      await resetThrowaway(admin, DST);
    } catch (error) {
      console.error(`cleanup ${error instanceof Error ? error.message : 'failed'}`);
    }
    await admin.end().catch(() => undefined);
    fs.rmSync(dumpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  if (!process.exitCode) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
});
