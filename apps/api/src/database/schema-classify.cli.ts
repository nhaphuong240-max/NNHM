import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PRE_RLS_MILESTONE } from './schema-milestones';
import { allowBootstrap, classify, mayDisposeCluster } from './schema-classify';

const baselineSql = readFileSync(join(__dirname, 'migrations', '1738339100000-BaselineCoreSchema.ts'));
const baselineSha256 = createHash('sha256').update(baselineSql).digest('hex');

const decision = classify({
  milestone: PRE_RLS_MILESTONE,
  connection: null,
  session: null,
  catalog: null,
});

const evidence = {
  milestone: PRE_RLS_MILESTONE.id,
  evidence: PRE_RLS_MILESTONE.evidence,
  sourceCommit: PRE_RLS_MILESTONE.sourceCommit,
  sqlSha256: PRE_RLS_MILESTONE.sqlSha256,
  tables: PRE_RLS_MILESTONE.tables,
  decision,
  bootstrap: allowBootstrap(PRE_RLS_MILESTONE),
  disposeCluster: mayDisposeCluster(null, null),
};

console.log(JSON.stringify(evidence, null, 2));
const bootstrap = allowBootstrap(PRE_RLS_MILESTONE);
if (
  PRE_RLS_MILESTONE.evidence !== 'VERIFIED' ||
  PRE_RLS_MILESTONE.sqlSha256 !== baselineSha256 ||
  decision.status === 'MISSING_EVIDENCE' ||
  decision.bootstrap !== false ||
  bootstrap.allow !== false ||
  decision.disposeCluster !== false
) {
  process.exitCode = 1;
}
