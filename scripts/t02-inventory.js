#!/usr/bin/env node
/**
 * Static inventory of Jest tests under apps/api/src.
 * Identities come from the TypeScript source, not from a test log.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'apps/api/node_modules/typescript'));

const DESCRIBE = new Set(['describe', 'xdescribe', 'fdescribe']);
const TEST = new Set(['it', 'test', 'xit', 'xtest', 'fit', 'ftest']);
const RUN_MODIFIERS = new Set(['concurrent', 'failing']);

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function staticText(node) {
  if (!node) return undefined;
  if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
    return node.text;
  }
  return undefined;
}

function calleeInfo(expr) {
  let name = '';
  let modifier = '';
  if (ts.isIdentifier(expr)) name = expr.text;
  else if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && ts.isIdentifier(expr.name)) {
    name = expr.expression.text;
    modifier = expr.name.text;
  } else return null;
  const kind = DESCRIBE.has(name) ? 'describe' : TEST.has(name) ? 'test' : '';
  if (!kind) return null;
  let mode = 'run';
  if (name.startsWith('x')) mode = 'skip';
  if (name.startsWith('f')) mode = 'only';
  if (modifier === 'skip') mode = 'skip';
  else if (modifier === 'todo') mode = 'todo';
  else if (modifier === 'only') mode = 'only';
  else if (modifier && !RUN_MODIFIERS.has(modifier)) mode = 'unresolved';
  return { kind, mode };
}

function parseSpec(file, text) {
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tests = [];
  const unresolved = [];
  let focused = false;

  function walk(node, ancestors, parentSkipped) {
    if (ts.isCallExpression(node)) {
      const info = calleeInfo(node.expression);
      if (info) {
        const title = staticText(node.arguments[0]);
        const line = lineOf(sourceFile, node);
        if (info.mode === 'unresolved' || title === undefined) {
          unresolved.push({ file, line, kind: info.kind, mode: info.mode });
          return;
        }
        if (info.mode === 'only') focused = true;
        if (info.kind === 'describe') {
          const callback = node.arguments.find((item) => ts.isFunctionLike(item));
          const skipped = parentSkipped || info.mode === 'skip' || info.mode === 'todo';
          if (callback && callback.body) walk(callback.body, ancestors.concat(title), skipped);
          return;
        }
        const mode = parentSkipped ? 'skip' : info.mode;
        tests.push({
          file,
          fullName: ancestors.concat(title).join(' '),
          title,
          ancestors: ancestors.slice(),
          mode,
          line,
        });
        return;
      }
    }
    ts.forEachChild(node, (child) => walk(child, ancestors, parentSkipped));
  }

  walk(sourceFile, [], false);
  return { tests, focused, unresolved };
}

function worktreeFiles() {
  const dir = path.join(root, 'apps/api/src');
  const out = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.spec.ts')) {
        out.push(path.relative(path.join(root, 'apps/api'), full).split(path.sep).join('/'));
      }
    }
  }
  walk(dir);
  return out.sort();
}

function gitFiles(rev) {
  const listed = execFileSync('git', ['ls-tree', '-r', '--name-only', rev], {
    cwd: root,
    encoding: 'utf8',
  });
  return listed
    .split('\n')
    .filter((file) => file.startsWith('apps/api/src/') && file.endsWith('.spec.ts'))
    .map((file) => file.slice('apps/api/'.length))
    .sort();
}

function headFiles() {
  return gitFiles('HEAD');
}

let cachedBase = '';

function mergeBase() {
  if (cachedBase) return cachedBase;
  const merge = () =>
    execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: root, encoding: 'utf8' }).trim();
  const hasMain = () => {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', 'origin/main'], { cwd: root, stdio: 'ignore' });
  };
  try {
    hasMain();
    cachedBase = merge();
    return cachedBase;
  } catch {
    /* origin/main is missing on a shallow checkout, or the histories do not meet yet. */
  }
  execFileSync('git', ['fetch', '--no-tags', 'origin', 'main'], { cwd: root, stdio: 'pipe' });
  try {
    cachedBase = merge();
    return cachedBase;
  } catch {
    execFileSync('git', ['fetch', '--no-tags', '--unshallow', 'origin'], { cwd: root, stdio: 'pipe' });
    cachedBase = merge();
    return cachedBase;
  }
}

function readFile(source, file) {
  if (source === 'head' || source === 'base') {
    const rev = source === 'head' ? 'HEAD' : mergeBase();
    return execFileSync('git', ['show', `${rev}:apps/api/${file}`], { cwd: root, encoding: 'utf8' });
  }
  return fs.readFileSync(path.join(root, 'apps/api', file), 'utf8');
}

function collect(source) {
  if (source !== 'head' && source !== 'worktree' && source !== 'base') {
    throw new Error('source must be worktree, head, or base');
  }
  const files = source === 'worktree' ? worktreeFiles() : source === 'head' ? headFiles() : gitFiles(mergeBase());
  const inventory = { source, files: {}, unresolved: [], duplicates: [] };
  for (const file of files) {
    const parsed = parseSpec(file, readFile(source, file));
    inventory.files[file] = { tests: parsed.tests, focused: parsed.focused };
    inventory.unresolved.push(...parsed.unresolved);
    const names = new Set();
    for (const test of parsed.tests) {
      if (names.has(test.fullName)) inventory.duplicates.push({ file, fullName: test.fullName });
      names.add(test.fullName);
    }
  }
  return inventory;
}

function relSuite(file) {
  const normalized = String(file).replace(/\\/g, '/');
  const marker = '/apps/api/';
  const at = normalized.indexOf(marker);
  if (at >= 0) return normalized.slice(at + marker.length);
  if (normalized.startsWith('apps/api/')) return normalized.slice('apps/api/'.length);
  return normalized;
}

function checkJest(inventory, result) {
  const missing = [];
  for (const suite of result.testResults || []) {
    const file = relSuite(suite.name);
    const known = new Set((inventory.files[file]?.tests || []).map((test) => test.fullName));
    for (const assertion of suite.assertionResults || []) {
      if (!known.has(assertion.fullName)) missing.push({ file, fullName: assertion.fullName });
    }
  }
  return missing;
}

function main() {
  const source = arg('--source') || 'worktree';
  if (source !== 'worktree' && source !== 'head' && source !== 'base') {
    console.error('source must be worktree, head, or base');
    process.exit(1);
  }
  const inventory = collect(source);
  const out = arg('--out');
  const body = JSON.stringify(inventory, null, 2);
  if (out) fs.writeFileSync(out, body);
  else process.stdout.write(`${body}\n`);
  const jestPath = arg('--check-jest');
  if (jestPath) {
    const result = JSON.parse(fs.readFileSync(jestPath, 'utf8'));
    const missing = checkJest(inventory, result);
    console.log(`inventoryFiles=${Object.keys(inventory.files).length}`);
    console.log(`unresolved=${inventory.unresolved.length} duplicates=${inventory.duplicates.length} jestMissing=${missing.length}`);
    if (missing.length) console.log(missing.slice(0, 20).map((item) => `${item.file} :: ${item.fullName}`).join('\n'));
    if (inventory.unresolved.length || inventory.duplicates.length || missing.length) process.exit(1);
  }
}

module.exports = { collect, relSuite, checkJest };

if (require.main === module) main();
