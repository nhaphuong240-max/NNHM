import { readFileSync } from 'fs';
import { join } from 'path';

describe('price window exclusion migration', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations/1758170000000-PriceWindowExclusion.ts'),
    'utf8',
  );

  it('adds an exclusion constraint for one tenant and project and drops that constraint on the way down', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist');
    expect(sql).toContain('CONSTRAINT "excl_price_book_windows"');
    expect(sql).toContain('EXCLUDE USING gist');
    expect(sql).toContain('"tenant_id" WITH =');
    expect(sql).toContain('"project_id" WITH =');
    expect(sql).toContain("tstzrange(\"effective_from\", \"effective_to\", '[)') WITH &&");
    expect(sql).toContain('WHERE ("effective_from" IS NOT NULL)');
    expect(sql).toContain('DROP CONSTRAINT "excl_price_book_windows"');
    expect(sql).not.toContain('DROP EXTENSION');
  });
});
