import { readFileSync } from 'fs';
import { join } from 'path';

describe('active hold unique migration', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations/1758150000000-ActiveHoldUnique.ts'),
    'utf8',
  );

  it('scans and constrains one active hold per unit, not per tenant', () => {
    expect(sql).toContain('GROUP BY unit_id');
    expect(sql).not.toContain('GROUP BY tenant_id, unit_id');
    expect(sql).toContain('ON "bookings" ("unit_id")');
    expect(sql).not.toContain('("tenant_id", "unit_id")');
  });
});
