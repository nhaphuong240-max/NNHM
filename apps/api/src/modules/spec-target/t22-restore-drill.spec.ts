import * as fs from 'fs';
import * as path from 'path';

describe('throwaway restore drill', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../../../../scripts/t22-restore-drill.js'),
    'utf8',
  );

  it('dumps a throwaway database and does not drop the isolated database', () => {
    expect(source).toContain("const SRC = 'wereal_t22_src'");
    expect(source).toContain("const DST = 'wereal_t22_dst'");
    expect(source).toContain('pg_dump');
    expect(source).toContain('--inserts');
    expect(source).toContain('transaction_timeout');
    expect(source).toContain('rpo=unmeasured');
    expect(source).toContain('rto_signed=false');
    expect(source).toContain('recommendation=none');
    expect(source).toContain('ngoinhahomnay');
    expect(source).not.toContain('DROP DATABASE IF EXISTS wereal_t02');
    expect(source).not.toContain('DROP DATABASE wereal_t02');
  });
});