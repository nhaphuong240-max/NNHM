import { PRE_RLS_MILESTONE } from './schema-milestones';
import {
  allowBootstrap,
  catalogDrift,
  classify,
  mayDisposeCluster,
  type Catalog,
  type ConnectionFacts,
  type HarnessSession,
  type Milestone,
  type TableSpec,
} from './schema-classify';

const connection: ConnectionFacts = {
  database: 'wereal_t02',
  user: 'wereal',
  serverAddr: '127.0.0.1',
  serverPort: 55432,
};

const session: HarnessSession = {
  ...connection,
  createdByHarness: true,
  disposable: true,
  confirmed: true,
};

function table(overrides: Partial<TableSpec> = {}): TableSpec {
  return {
    name: 'projects',
    columns: [
      { name: 'id', dataType: 'uuid', nullable: false },
      { name: 'tenant_id', dataType: 'uuid', nullable: false },
    ],
    constraints: [{ name: 'projects_pkey', type: 'PRIMARY KEY' }],
    indexes: [{ name: 'projects_tenant_idx', columns: ['tenant_id'] }],
    rlsEnabled: true,
    policies: ['projects_tenant_isolation'],
    ...overrides,
  };
}

const verified: Milestone = {
  id: 'fixture-only',
  evidence: 'VERIFIED',
  sourceCommit: '0000000000000000000000000000000000000000',
  sqlSha256: 'abc',
  tables: [table()],
};

describe('schema classify refusals', () => {
  it('blocks bootstrap when pre-RLS evidence is missing', () => {
    const decision = classify({
      milestone: PRE_RLS_MILESTONE,
      connection,
      session,
      catalog: { tables: [] },
    });
    expect(PRE_RLS_MILESTONE.tables).toEqual([]);
    expect(PRE_RLS_MILESTONE.evidence).toBe('MISSING_EVIDENCE');
    expect(decision.status).toBe('MISSING_EVIDENCE');
    expect(decision.bootstrap).toBe(false);
    expect(decision.ddl).toBe(false);
    expect(decision.disposeCluster).toBe(false);
    expect(allowBootstrap(PRE_RLS_MILESTONE)).toEqual({
      allow: false,
      reason: 'MISSING_EVIDENCE',
    });
  });

  it('rejects a catalog that only partially matches a milestone', () => {
    const catalog: Catalog = {
      tables: [
        table({
          columns: [{ name: 'id', dataType: 'text', nullable: false }],
          rlsEnabled: false,
          policies: [],
        }),
      ],
    };
    const decision = classify({
      milestone: verified,
      connection,
      session,
      catalog,
    });
    expect(decision.status).toBe('DRIFT');
    expect(decision.ddl).toBe(false);
    expect(decision.bootstrap).toBe(false);
    expect(catalogDrift(verified.tables, catalog.tables).length).toBeGreaterThan(0);
  });

  it('rejects a connection that is not the harness session', () => {
    const decision = classify({
      milestone: verified,
      connection: { ...connection, serverPort: 5432 },
      session,
      catalog: { tables: [table()] },
    });
    expect(decision.status).toBe('UNKNOWN');
    expect(decision.ddl).toBe(false);
    expect(decision.bootstrap).toBe(false);
    expect(mayDisposeCluster({ ...connection, serverPort: 5432 }, session)).toBe(false);
  });

  it('refuses to dispose a cluster the harness did not create', () => {
    expect(mayDisposeCluster(connection, { ...session, createdByHarness: false })).toBe(false);
    expect(mayDisposeCluster(connection, { ...session, confirmed: false })).toBe(false);
    expect(mayDisposeCluster(connection, null)).toBe(false);
    const blocked = classify({
      milestone: PRE_RLS_MILESTONE,
      connection,
      session,
      catalog: { tables: [] },
    });
    expect(blocked.disposeCluster).toBe(false);
    expect(mayDisposeCluster(connection, session)).toBe(true);
  });

  it('still refuses bootstrap when a verified catalog matches', () => {
    const decision = classify({
      milestone: verified,
      connection,
      session,
      catalog: { tables: [table()] },
    });
    expect(decision.status).toBe('MATCHED');
    expect(decision.ddl).toBe(true);
    expect(decision.bootstrap).toBe(false);
    expect(allowBootstrap(verified).allow).toBe(false);
  });
});
