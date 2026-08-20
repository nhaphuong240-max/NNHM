#!/usr/bin/env node
/** OPS-S6-04 — enumerate NestJS controller routes for contract coverage gate. */
import { readdirSync, readFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SRC = join(ROOT, 'apps/api/src');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(p));
    else if (name.name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

function parseController(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const ctrl = text.match(/@Controller\(['"`]([^'"`]*?)['"`]\)/)?.[1] ?? '';
  const routes = [];
  const methodRe =
    /@(Get|Post|Put|Patch|Delete)\(['"`]?([^'"`)\n]*?)['"`]?\)/g;
  let m;
  while ((m = methodRe.exec(text))) {
    const method = m[1].toUpperCase();
    const sub = (m[2] ?? '').trim();
    const base = ctrl.replace(/^\//, '');
    const pathParts = [base, sub].filter(Boolean).join('/');
    const fullPath = '/' + pathParts.replace(/\/+/g, '/');
    routes.push({ method, path: fullPath, file: relative(ROOT, filePath) });
  }
  return routes;
}

const all = walk(SRC).flatMap(parseController);
const unique = [...new Map(all.map((r) => [`${r.method} ${r.path}`, r])).values()].sort(
  (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
);

console.log(JSON.stringify({ count: unique.length, routes: unique }, null, 2));
