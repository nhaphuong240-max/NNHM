import {
  productionDbConfigIssues,
  resolveDbSynchronize,
} from './production-db-config';

describe('productionDbConfig', () => {
  it('rejects missing DATABASE_URL and DB_SYNCHRONIZE=true in production', () => {
    const issues = productionDbConfigIssues({
      NODE_ENV: 'production',
      DB_SYNCHRONIZE: 'true',
    });
    expect(issues.map((issue) => issue.id)).toEqual(['C-DB-URL', 'C-DB-SYNC']);
    expect(resolveDbSynchronize({ NODE_ENV: 'production', DB_SYNCHRONIZE: 'true' })).toBe(false);
  });

  it('accepts an explicit test URL with synchronize off', () => {
    expect(
      productionDbConfigIssues({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://wereal:wereal@127.0.0.1:55432/wereal_t02',
        DB_SYNCHRONIZE: 'false',
      }),
    ).toEqual([]);
  });

  it('does not flag development defaults', () => {
    expect(productionDbConfigIssues({ NODE_ENV: 'development' })).toEqual([]);
    expect(resolveDbSynchronize({ NODE_ENV: 'development' })).toBe(true);
    expect(resolveDbSynchronize({ NODE_ENV: 'development', DB_SYNCHRONIZE: 'false' })).toBe(false);
  });
});
