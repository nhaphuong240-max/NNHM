/** T02 — production database config gate. Not a business-rule change. */

export type DbConfigEnv = {
  NODE_ENV?: string;
  STRICT_PRODUCTION_SECURITY?: string;
  DATABASE_URL?: string;
  DB_SYNCHRONIZE?: string;
};

export type DbConfigIssue = {
  id: 'C-DB-URL' | 'C-DB-SYNC';
  detail: string;
};

export function isStrictDbEnv(env: DbConfigEnv): boolean {
  return env.NODE_ENV === 'production' || env.STRICT_PRODUCTION_SECURITY === 'true';
}

/** Unsafe production settings. Empty when the process is not in strict mode. */
export function productionDbConfigIssues(env: DbConfigEnv): DbConfigIssue[] {
  if (!isStrictDbEnv(env)) return [];
  const issues: DbConfigIssue[] = [];
  if (!env.DATABASE_URL?.trim()) {
    issues.push({
      id: 'C-DB-URL',
      detail: 'DATABASE_URL is required when NODE_ENV=production or STRICT_PRODUCTION_SECURITY=true',
    });
  }
  if (env.DB_SYNCHRONIZE === 'true') {
    issues.push({
      id: 'C-DB-SYNC',
      detail: 'DB_SYNCHRONIZE=true is forbidden when NODE_ENV=production or STRICT_PRODUCTION_SECURITY=true',
    });
  }
  return issues;
}

/** Production never auto-syncs, even if DB_SYNCHRONIZE=true. Non-production keeps the previous default. */
export function resolveDbSynchronize(env: DbConfigEnv): boolean {
  if (isStrictDbEnv(env)) return false;
  if (env.DB_SYNCHRONIZE === 'false') return false;
  return true;
}

/** CI entry: exit non-zero unless unsafe production configs are rejected. */
export function assertT02ConfigGate(): void {
  const badSync = productionDbConfigIssues({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://wereal:wereal@127.0.0.1:55432/wereal_t02',
    DB_SYNCHRONIZE: 'true',
  });
  if (!badSync.some((issue) => issue.id === 'C-DB-SYNC')) {
    throw new Error('FAIL C-DB-SYNC: DB_SYNCHRONIZE=true was not rejected');
  }
  const missingUrl = productionDbConfigIssues({
    NODE_ENV: 'production',
    DB_SYNCHRONIZE: 'false',
  });
  if (!missingUrl.some((issue) => issue.id === 'C-DB-URL')) {
    throw new Error('FAIL C-DB-URL: missing DATABASE_URL was not rejected');
  }
  const strictFlag = productionDbConfigIssues({
    NODE_ENV: 'development',
    STRICT_PRODUCTION_SECURITY: 'true',
    DB_SYNCHRONIZE: 'true',
  });
  if (!strictFlag.some((issue) => issue.id === 'C-DB-URL') || !strictFlag.some((issue) => issue.id === 'C-DB-SYNC')) {
    throw new Error('FAIL: STRICT_PRODUCTION_SECURITY did not fail closed');
  }
  const safe = productionDbConfigIssues({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://wereal:wereal@127.0.0.1:55432/wereal_t02',
    DB_SYNCHRONIZE: 'false',
  });
  if (safe.length > 0) {
    throw new Error(`FAIL: safe production config rejected: ${safe.map((issue) => issue.id).join(',')}`);
  }
  if (resolveDbSynchronize({ NODE_ENV: 'production', DB_SYNCHRONIZE: 'true' }) !== false) {
    throw new Error('FAIL: synchronize stayed enabled in production');
  }
  if (resolveDbSynchronize({ NODE_ENV: 'development' }) !== true) {
    throw new Error('FAIL: development synchronize default changed');
  }
  console.log('PASS t02 production config gate');
}
