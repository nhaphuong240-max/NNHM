import { PRE_RLS_MILESTONE } from './schema-milestones';
import { allowBootstrap, classify, mayDisposeCluster } from './schema-classify';

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
if (decision.status !== 'MATCHED' || decision.ddl !== true || decision.bootstrap !== false) {
  process.exitCode = 1;
}
