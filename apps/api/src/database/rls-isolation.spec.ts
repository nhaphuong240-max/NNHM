import {
  TENANT_ID_TABLES,
  buildDisableRlsStatements,
  buildEnableRlsStatements,
} from './rls/tenant-scoped-tables';

describe('tenant-scoped-tables (ADR-002)', () => {
  it('covers all core tenant_id tables', () => {
    expect(TENANT_ID_TABLES).toContain('units');
    expect(TENANT_ID_TABLES).toContain('bookings');
    expect(TENANT_ID_TABLES).toContain('leads');
    expect(TENANT_ID_TABLES.length).toBeGreaterThanOrEqual(50);
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
