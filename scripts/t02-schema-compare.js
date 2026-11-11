#!/usr/bin/env node
/**
 * Compare the live public catalog to the 79 entity files.
 * Column identity is name, type, and null. Index identity is the column list.
 * Sort direction is ignored because the approved time indexes are DESC.
 * A multi-column @Index or @Unique on a property is refused. TypeORM keeps only
 * the property name in that position, so the array in source is not the index.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const ts = require('typescript');

const root = path.resolve(__dirname, '../apps/api/src/database');
const entityDir = path.join(root, 'entities');

function readTableArray(source, constName) {
  const match = source.match(new RegExp(`${constName} = \\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return match[1].match(/'([^']+)'/g).map((item) => item.slice(1, -1));
}

const rlsSource = fs.readFileSync(path.join(root, 'rls/tenant-scoped-tables.ts'), 'utf8');
const RLS_TABLES = new Set([
  ...readTableArray(rlsSource, 'TENANT_ID_TABLES'),
  ...readTableArray(rlsSource, 'REMAINING_TENANT_ID_TABLES'),
  ...readTableArray(rlsSource, 'SPEC_TENANT_TABLES'),
  'tenants',
  'agency_applications',
]);

function decoratorsOf(node) {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
}

function decoratorName(dec) {
  const expr = dec.expression;
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) return expr.expression.text;
  return '';
}

function callArgs(dec) {
  return ts.isCallExpression(dec.expression) ? dec.expression.arguments : [];
}

function literal(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  return undefined;
}

function objectProps(node) {
  if (!node || !ts.isObjectLiteralExpression(node)) return null;
  const out = {};
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = ts.isIdentifier(prop.name) ? prop.name.text : ts.isStringLiteral(prop.name) ? prop.name.text : null;
    if (!key) continue;
    const value = literal(prop.initializer);
    out[key] = value === undefined ? prop.initializer.getText() : value;
  }
  return out;
}

function stringArray(node) {
  if (!node || !ts.isArrayLiteralExpression(node)) return null;
  const names = [];
  for (const el of node.elements) {
    if (!ts.isStringLiteral(el)) return null;
    names.push(el.text);
  }
  return names;
}

function entityType(options) {
  const base = options.type;
  if (base === 'varchar') return `varchar(${options.length})`;
  if (base === 'int' || base === 'integer') return 'int';
  if (base === 'numeric') {
    if (options.precision == null) return 'numeric';
    if (options.scale == null) return `numeric(${options.precision})`;
    return `numeric(${options.precision},${options.scale})`;
  }
  if (base === 'timestamptz') return 'timestamptz';
  return base;
}

function parseEntity(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = [];
  function visit(node) {
    if (ts.isClassDeclaration(node) && decoratorsOf(node).some((d) => decoratorName(d) === 'Entity')) {
      found.push(parseClass(node));
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return found;
}

function parseClass(node) {
  const entityDec = decoratorsOf(node).find((d) => decoratorName(d) === 'Entity');
  const table = objectProps(callArgs(entityDec)[0]).name;
  const columns = [];
  const uniques = [];
  const indexes = [];
  const fks = [];
  const propToCol = new Map();
  const pending = [];
  const propertyComposites = [];

  function addKey(list, cols, where) {
    list.push(`${cols.join(',')}|${where ?? ''}`);
  }

  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) continue;
    const property = member.name.text;
    const decs = decoratorsOf(member);
    const colDec = decs.find((d) =>
      ['Column', 'PrimaryColumn', 'PrimaryGeneratedColumn', 'CreateDateColumn', 'UpdateDateColumn', 'VersionColumn'].includes(decoratorName(d)),
    );
    if (colDec) {
      const kind = decoratorName(colDec);
      const options = objectProps(callArgs(colDec).find((arg) => ts.isObjectLiteralExpression(arg))) ?? {};
      if (kind === 'PrimaryGeneratedColumn' && !options.type) options.type = 'int';
      if (kind === 'VersionColumn' && !options.type) options.type = 'int';
      const name = typeof options.name === 'string' ? options.name : property;
      propToCol.set(property, name);
      const type = kind === 'PrimaryGeneratedColumn' && options.type === 'bigint' ? 'bigint' : entityType(options);
      columns.push({
        name,
        type,
        nullable: kind.startsWith('Primary') || kind.endsWith('DateColumn') ? false : options.nullable === true,
      });
      if (options.unique === true) addKey(uniques, [name], null);
    }
    const many = decs.find((d) => decoratorName(d) === 'ManyToOne');
    const join = decs.find((d) => decoratorName(d) === 'JoinColumn');
    if (many && join) {
      const manyOpts = objectProps(callArgs(many).find((arg) => ts.isObjectLiteralExpression(arg))) ?? {};
      const joinOpts = objectProps(callArgs(join)[0]) ?? {};
      fks.push({
        column: joinOpts.name,
        onDelete: typeof manyOpts.onDelete === 'string' ? manyOpts.onDelete : 'NO ACTION',
      });
    }
    for (const dec of decs) {
      const name = decoratorName(dec);
      if (name !== 'Index' && name !== 'Unique') continue;
      const args = callArgs(dec);
      const cols = stringArray(args[0]);
      const opts = objectProps(args[0]) ?? objectProps(args[1]) ?? {};
      if (cols && cols.length > 1) {
        propertyComposites.push(`${name}(${cols.join(',')}) on ${property}`);
      }
      pending.push({
        cols: [property],
        unique: name === 'Unique' || opts.unique === true,
        where: typeof opts.where === 'string' ? opts.where : null,
      });
    }
  }
  for (const dec of decoratorsOf(node)) {
    const name = decoratorName(dec);
    if (name !== 'Index' && name !== 'Unique') continue;
    const args = callArgs(dec);
    const cols = stringArray(args[0]);
    if (!cols) continue;
    const opts = objectProps(args[1]) ?? {};
    pending.push({
      cols,
      unique: name === 'Unique' || opts.unique === true,
      where: typeof opts.where === 'string' ? opts.where : null,
    });
  }
  for (const item of pending) {
    const mapped = item.cols.map((property) => {
      const column = propToCol.get(property);
      if (!column) throw new Error(`${table}.${property} is not a column`);
      return column;
    });
    if (item.unique) addKey(uniques, mapped, item.where);
    else addKey(indexes, mapped, null);
  }
  return { table, columns, uniques, indexes, fks, propertyComposites };
}

function normType(row) {
  const data = row.data_type;
  if (data === 'character varying') return `varchar(${row.character_maximum_length})`;
  if (data === 'integer') return 'int';
  if (data === 'bigint') return 'bigint';
  if (data === 'timestamp with time zone') return 'timestamptz';
  if (data === 'numeric') {
    if (row.numeric_precision == null) return 'numeric';
    return `numeric(${row.numeric_precision},${row.numeric_scale ?? 0})`;
  }
  return data;
}

function normPred(value) {
  if (!value) return '';
  return value.replace(/"/g, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function relname(value) {
  return String(value).replace(/"/g, '').split('.').pop();
}

function asCols(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.replace(/^{|}$/g, '').split(',').filter(Boolean);
  return [];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const expected = new Map();
  const propertyComposites = [];
  for (const file of fs.readdirSync(entityDir).filter((name) => name.endsWith('.entity.ts'))) {
    for (const table of parseEntity(path.join(entityDir, file))) {
      expected.set(table.table, table);
      for (const item of table.propertyComposites) propertyComposites.push(`${table.table} ${item}`);
    }
  }
  if (propertyComposites.length) {
    console.log(`DIFF=${propertyComposites.length}`);
    for (const item of propertyComposites) {
      console.log(`property composite decorator ignored by TypeORM: ${item}`);
    }
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const columns = await client.query(
    `SELECT table_name, column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name <> 'migrations'`,
  );
  const indexes = await client.query(
    `SELECT t.relname AS table_name, idx.indisunique, idx.indisprimary,
            pg_get_expr(idx.indpred, idx.indrelid) AS pred,
            (
              SELECT array_agg(a.attname ORDER BY k.ord)
              FROM unnest(idx.indkey) WITH ORDINALITY AS k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = k.attnum
            ) AS columns
     FROM pg_index idx
     JOIN pg_class t ON t.oid = idx.indrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relkind = 'r'`,
  );
  const fks = await client.query(
    `SELECT conrelid::regclass::text AS table_name, pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE contype = 'f'`,
  );
  const rls = await client.query(
    `SELECT c.relname AS table_name, c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'migrations'`,
  );
  const policies = await client.query(
    `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'`,
  );
  await client.end();

  const problems = [];
  const dbTables = new Set(rls.rows.map((row) => row.table_name));
  for (const name of [...dbTables].sort()) {
    if (!expected.has(name)) problems.push(`unexpected table ${name}`);
  }
  for (const name of [...expected.keys()].sort()) {
    if (!dbTables.has(name)) problems.push(`missing table ${name}`);
  }

  const colsByTable = new Map();
  for (const row of columns.rows) {
    const list = colsByTable.get(row.table_name) ?? [];
    list.push(row);
    colsByTable.set(row.table_name, list);
  }
  for (const [name, table] of expected) {
    const got = new Map((colsByTable.get(name) ?? []).map((row) => [row.column_name, row]));
    const want = new Map(table.columns.map((column) => [column.name, column]));
    for (const column of want.values()) {
      const row = got.get(column.name);
      if (!row) {
        problems.push(`${name}.${column.name} missing`);
        continue;
      }
      const actual = normType(row);
      if (actual !== column.type) problems.push(`${name}.${column.name} type ${actual} != ${column.type}`);
      const nullable = row.is_nullable === 'YES';
      if (nullable !== column.nullable) problems.push(`${name}.${column.name} nullable ${nullable} != ${column.nullable}`);
    }
    for (const row of got.values()) {
      if (!want.has(row.column_name)) problems.push(`${name}.${row.column_name} unexpected column`);
    }
  }

  const indexByTable = new Map();
  for (const row of indexes.rows) {
    const list = indexByTable.get(row.table_name) ?? [];
    list.push(row);
    indexByTable.set(row.table_name, list);
  }
  for (const [name, table] of expected) {
    const rows = indexByTable.get(name) ?? [];
    const gotUnique = new Set(
      rows
        .filter((row) => row.indisunique && !row.indisprimary)
        .map((row) => `${asCols(row.columns).join(',')}|${normPred(row.pred)}`),
    );
    const gotIndex = new Set(
      rows.filter((row) => !row.indisunique && !row.indisprimary).map((row) => asCols(row.columns).join(',')),
    );
    const wantUnique = new Set(table.uniques.map((item) => {
      const [cols, where] = item.split('|');
      return `${cols}|${normPred(where)}`;
    }));
    const wantIndex = new Set(table.indexes.map((item) => item.split('|')[0]));
    for (const item of wantUnique) if (!gotUnique.has(item)) problems.push(`${name} missing unique ${item}`);
    for (const item of gotUnique) if (!wantUnique.has(item)) problems.push(`${name} unexpected unique ${item}`);
    for (const item of wantIndex) if (!gotIndex.has(item)) problems.push(`${name} missing index ${item}`);
    for (const item of gotIndex) if (!wantIndex.has(item)) problems.push(`${name} unexpected index ${item}`);
  }

  const fkByTable = new Map();
  for (const row of fks.rows) {
    const table = relname(row.table_name);
    const match = row.def.match(/FOREIGN KEY \(([^)]+)\) REFERENCES "?([a-z0-9_]+)"?\(([^)]+)\)(?: ON DELETE ([A-Z ]+))?/i);
    if (!match) {
      problems.push(`${table} unparsed fk ${row.def}`);
      continue;
    }
    const list = fkByTable.get(table) ?? [];
    list.push(`${match[1].replace(/"/g, '')}->${match[2]}.${match[3].replace(/"/g, '')} ON DELETE ${match[4] ?? 'NO ACTION'}`);
    fkByTable.set(table, list);
  }
  for (const [name, table] of expected) {
    const got = new Set(fkByTable.get(name) ?? []);
    const want = new Set(table.fks.map((fk) => `${fk.column}->${fk.onDelete}`));
    for (const item of got) {
      const [left, action] = item.split(' ON DELETE ');
      const column = left.split('->')[0];
      const expectedFk = table.fks.find((fk) => fk.column === column);
      if (!expectedFk) problems.push(`${name} unexpected fk ${item}`);
      else if (expectedFk.onDelete !== action) problems.push(`${name} fk ${column} ${action} != ${expectedFk.onDelete}`);
    }
    for (const fk of want) {
      const column = fk.split('->')[0];
      if (![...got].some((item) => item.startsWith(`${column}->`))) problems.push(`${name} missing fk ${fk}`);
    }
  }

  const policyByTable = new Map();
  for (const row of policies.rows) {
    const list = policyByTable.get(row.tablename) ?? [];
    list.push(row.policyname);
    policyByTable.set(row.tablename, list);
  }
  for (const row of rls.rows) {
    const names = policyByTable.get(row.table_name) ?? [];
    if (RLS_TABLES.has(row.table_name)) {
      if (!row.relrowsecurity || !row.relforcerowsecurity) problems.push(`${row.table_name} rls not forced`);
      if (names.join(',') !== 'tenant_isolation') problems.push(`${row.table_name} policies ${names.join(',') || 'none'}`);
    } else if (row.relrowsecurity || names.length) {
      problems.push(`${row.table_name} unexpected rls`);
    }
  }

  if (problems.length) {
    console.log(`DIFF=${problems.length}`);
    for (const problem of problems) console.log(problem);
    process.exit(1);
  }
  console.log(`DIFF=0 tables=${expected.size}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
