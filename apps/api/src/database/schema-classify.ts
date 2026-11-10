export type EvidenceStatus = 'MISSING_EVIDENCE' | 'VERIFIED';

export type ColumnSpec = {
  name: string;
  dataType: string;
  nullable: boolean;
};

export type ConstraintSpec = {
  name: string;
  type: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY' | 'CHECK';
};

export type IndexSpec = {
  name: string;
  columns: string[];
};

export type TableSpec = {
  name: string;
  columns: ColumnSpec[];
  constraints: ConstraintSpec[];
  indexes: IndexSpec[];
  rlsEnabled: boolean;
  policies: string[];
};

export type Milestone = {
  id: string;
  evidence: EvidenceStatus;
  sourceCommit: string | null;
  sqlSha256: string | null;
  tables: TableSpec[];
};

export type ConnectionFacts = {
  database: string;
  user: string;
  serverAddr: string;
  serverPort: number;
};

export type HarnessSession = ConnectionFacts & {
  createdByHarness: boolean;
  disposable: boolean;
  confirmed: boolean;
};

export type Catalog = {
  tables: TableSpec[];
};

export type ClassifyStatus = 'MISSING_EVIDENCE' | 'UNKNOWN' | 'DRIFT' | 'MATCHED';

export type ClassifyDecision = {
  status: ClassifyStatus;
  bootstrap: false;
  ddl: boolean;
  disposeCluster: false;
  reasons: string[];
};

export function allowBootstrap(milestone: Milestone): { allow: false; reason: string } {
  if (milestone.evidence !== 'VERIFIED' || !milestone.sourceCommit || !milestone.sqlSha256) {
    return { allow: false, reason: 'MISSING_EVIDENCE' };
  }
  return {
    allow: false,
    reason: 'bootstrap disabled; this change does not apply schema SQL',
  };
}

export function connectionMatchesSession(
  connection: ConnectionFacts,
  session: HarnessSession,
): boolean {
  return (
    session.createdByHarness &&
    session.disposable &&
    session.confirmed &&
    connection.database === session.database &&
    connection.user === session.user &&
    connection.serverAddr === session.serverAddr &&
    connection.serverPort === session.serverPort
  );
}

export function mayDisposeCluster(
  connection: ConnectionFacts | null,
  session: HarnessSession | null,
): boolean {
  if (!connection || !session) return false;
  return connectionMatchesSession(connection, session);
}

function byName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function sameColumns(expected: ColumnSpec[], actual: ColumnSpec[]): string | null {
  const exp = byName(expected);
  const got = byName(actual);
  if (exp.length !== got.length) return `column count ${got.length} != ${exp.length}`;
  for (let i = 0; i < exp.length; i += 1) {
    if (exp[i].name !== got[i].name) return `column ${exp[i].name} missing or renamed`;
    if (exp[i].dataType !== got[i].dataType) {
      return `column ${exp[i].name} type ${got[i].dataType} != ${exp[i].dataType}`;
    }
    if (exp[i].nullable !== got[i].nullable) return `column ${exp[i].name} nullability differs`;
  }
  return null;
}

function sameNamed(
  label: string,
  expected: { name: string; signature: string }[],
  actual: { name: string; signature: string }[],
): string | null {
  const exp = [...expected].sort((a, b) => a.name.localeCompare(b.name));
  const got = [...actual].sort((a, b) => a.name.localeCompare(b.name));
  if (exp.length !== got.length) return `${label} count ${got.length} != ${exp.length}`;
  for (let i = 0; i < exp.length; i += 1) {
    if (exp[i].name !== got[i].name || exp[i].signature !== got[i].signature) {
      return `${label} ${exp[i].name} mismatch`;
    }
  }
  return null;
}

export function catalogDrift(expected: TableSpec[], actual: TableSpec[]): string[] {
  const reasons: string[] = [];
  const actualByName = new Map(actual.map((table) => [table.name, table]));
  const expectedNames = new Set(expected.map((table) => table.name));
  for (const name of [...actualByName.keys()].sort()) {
    if (!expectedNames.has(name)) reasons.push(`unexpected table ${name}`);
  }
  for (const table of byName(expected)) {
    const got = actualByName.get(table.name);
    if (!got) {
      reasons.push(`missing table ${table.name}`);
      continue;
    }
    const columnDiff = sameColumns(table.columns, got.columns);
    if (columnDiff) reasons.push(`${table.name}: ${columnDiff}`);
    const constraintDiff = sameNamed(
      'constraint',
      table.constraints.map((item) => ({ name: item.name, signature: item.type })),
      got.constraints.map((item) => ({ name: item.name, signature: item.type })),
    );
    if (constraintDiff) reasons.push(`${table.name}: ${constraintDiff}`);
    const indexDiff = sameNamed(
      'index',
      table.indexes.map((item) => ({ name: item.name, signature: item.columns.join(',') })),
      got.indexes.map((item) => ({ name: item.name, signature: item.columns.join(',') })),
    );
    if (indexDiff) reasons.push(`${table.name}: ${indexDiff}`);
    if (got.rlsEnabled !== table.rlsEnabled) {
      reasons.push(`${table.name}: rls enabled ${got.rlsEnabled} != ${table.rlsEnabled}`);
    }
    const expectedPolicies = [...table.policies].sort().join('|');
    const actualPolicies = [...got.policies].sort().join('|');
    if (expectedPolicies !== actualPolicies) reasons.push(`${table.name}: rls policies differ`);
  }
  return reasons;
}

export function classify(input: {
  milestone: Milestone;
  connection: ConnectionFacts | null;
  session: HarnessSession | null;
  catalog: Catalog | null;
}): ClassifyDecision {
  const blocked: ClassifyDecision = {
    status: 'MISSING_EVIDENCE',
    bootstrap: false,
    ddl: false,
    disposeCluster: false,
    reasons: [],
  };
  if (input.milestone.evidence !== 'VERIFIED' || !input.milestone.sourceCommit || !input.milestone.sqlSha256) {
    blocked.reasons.push('MISSING_EVIDENCE: milestone has no source commit or checksum');
    blocked.reasons.push('bootstrap refused');
    blocked.reasons.push('ddl refused');
    blocked.reasons.push('cluster dispose refused while evidence is missing');
    return blocked;
  }
  if (!input.connection || !input.session || !connectionMatchesSession(input.connection, input.session)) {
    return {
      status: 'UNKNOWN',
      bootstrap: false,
      ddl: false,
      disposeCluster: false,
      reasons: ['connection does not match a confirmed harness session'],
    };
  }
  if (!input.catalog) {
    return {
      status: 'UNKNOWN',
      bootstrap: false,
      ddl: false,
      disposeCluster: false,
      reasons: ['catalog was not read'],
    };
  }
  const drift = catalogDrift(input.milestone.tables, input.catalog.tables);
  if (drift.length > 0) {
    return {
      status: 'DRIFT',
      bootstrap: false,
      ddl: false,
      disposeCluster: false,
      reasons: drift,
    };
  }
  return {
    status: 'MATCHED',
    bootstrap: false,
    ddl: true,
    disposeCluster: false,
    reasons: ['catalog matches milestone; bootstrap still disabled'],
  };
}
