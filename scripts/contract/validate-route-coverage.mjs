#!/usr/bin/env node
/** OPS-S6-04 — contract gate: required OPS paths documented + coverage report. */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const TARGET_PATHS = Number(process.env.OPENAPI_TARGET_PATHS ?? 200);
const MIN_PATHS = Number(process.env.OPENAPI_MIN_PATHS ?? 80);

const REQUIRED_OPS_PATHS = [
  '/ops/console',
  '/ops/readiness',
  '/health/ops',
  '/health/observability',
  '/health/enterprise',
  '/admin/config/rails/resolved',
  '/commission/settlement/runs',
  '/integrations/bank/webhook',
  '/tenants/branding',
  '/auth/sso/providers',
  '/contracts/{contractId}/sign-session',
  '/crm/inbox',
];

function loadOpenApiPaths(...files) {
  const paths = new Set();
  for (const file of files) {
    if (!existsSync(file)) continue;
    const y = readFileSync(file, 'utf8');
    for (const m of y.matchAll(/^  (\/[^\n:]+):/gm)) {
      paths.add(m[1].trim());
    }
  }
  return paths;
}

const mainSpec = join(ROOT, 'openapi.yaml');
const extSpec = join(ROOT, 'openapi.ops-s6-extensions.yaml');
const documented = loadOpenApiPaths(mainSpec, extSpec);

const missingRequired = REQUIRED_OPS_PATHS.filter((p) => !documented.has(p));
if (missingRequired.length) {
  console.error('✗ Missing required OPS paths in OpenAPI:');
  for (const p of missingRequired) console.error('  -', p);
  process.exit(1);
}
console.log(`✓ Required OPS paths documented (${REQUIRED_OPS_PATHS.length})`);

const enumResult = spawnSync(process.execPath, [join(ROOT, 'scripts/contract/enumerate-nest-routes.mjs')], {
  encoding: 'utf8',
});
if (enumResult.status !== 0) {
  console.error(enumResult.stderr || enumResult.stdout || 'enumerate-nest-routes failed');
  process.exit(1);
}
const { count: nestCount, routes } = JSON.parse(enumResult.stdout);
const documentedList = [...documented];
let matched = 0;
for (const route of routes) {
  const norm = route.path.replace(/:([A-Za-z]+)/g, '{$1}');
  if (documented.has(norm) || documented.has(route.path)) matched += 1;
}
const pathCount = documented.size;
const coveragePct = Math.round((matched / nestCount) * 100);

console.log(`OpenAPI paths: ${pathCount} (min ${MIN_PATHS}, target ${TARGET_PATHS})`);
console.log(`Nest routes: ${nestCount} · matched in spec: ${matched} (${coveragePct}%)`);

if (pathCount < MIN_PATHS) {
  console.error(`✗ OPENAPI_MIN_PATHS not met (${pathCount} < ${MIN_PATHS})`);
  process.exit(1);
}

if (pathCount < TARGET_PATHS) {
  console.log(`○ Target ${TARGET_PATHS} paths — continue expanding openapi.ops-s6-extensions.yaml`);
}

console.log('=== validate-route-coverage PASS ===');
