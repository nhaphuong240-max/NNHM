import {
  REMAINING_TENANT_ID_TABLES,
  SPEC_TENANT_TABLES,
  TENANT_ID_TABLES,
  buildDisableRlsStatements,
  buildEnableRlsStatements,
  buildRemainingRlsRollback,
  buildRemainingRlsStatements,
} from './rls/tenant-scoped-tables';

describe('tenant-scoped-tables (ADR-002)', () => {
  it('covers all core tenant_id tables', () => {
    expect(TENANT_ID_TABLES).toContain('units');
    expect(TENANT_ID_TABLES).toContain('bookings');
    expect(TENANT_ID_TABLES).toContain('leads');
    expect(TENANT_ID_TABLES.length).toBeGreaterThanOrEqual(50);
  });

  it('keeps the 22 later tables out of the original RLS migration list', () => {
    expect(REMAINING_TENANT_ID_TABLES).toHaveLength(22);
    for (const table of REMAINING_TENANT_ID_TABLES) {
      expect(TENANT_ID_TABLES).not.toContain(table);
    }
    const enable = buildRemainingRlsStatements(REMAINING_TENANT_ID_TABLES);
    const rollback = buildRemainingRlsRollback(REMAINING_TENANT_ID_TABLES);
    expect(enable.filter((sql) => sql.includes('ENABLE ROW LEVEL SECURITY'))).toHaveLength(22);
    expect(enable.filter((sql) => sql.includes('FORCE ROW LEVEL SECURITY'))).toHaveLength(22);
    expect(enable.filter((sql) => sql.includes('tenant_isolation'))).toHaveLength(22);
    expect(rollback[0]).toContain('DROP POLICY');
    expect(rollback[1]).toContain('NO FORCE');
    expect(rollback[2]).toContain('DISABLE');
    expect(SPEC_TENANT_TABLES).toHaveLength(15);
  });

  it('generates enable/disable RLS SQL pairs', () => {
    const enable = buildEnableRlsStatements();
    const disable = buildDisableRlsStatements();
    expect(enable.some((s) => s.includes('ENABLE ROW LEVEL SECURITY'))).toBe(true);
    expect(enable.some((s) => s.includes('FORCE ROW LEVEL SECURITY'))).toBe(true);
    expect(enable.some((s) => s.includes('agency_applications'))).toBe(true);
    expect(disable.some((s) => s.includes('DISABLE ROW LEVEL SECURITY'))).toBe(true);
  });
});
