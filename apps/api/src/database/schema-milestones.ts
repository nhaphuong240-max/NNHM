import type { Milestone } from './schema-classify';

/**
 * Pre-RLS catalog cannot be reconstructed from git history.
 * Commit 3e794fe already mixes entity columns with later migrations.
 * Empty evidence is a hard stop: no snapshot SQL is shipped here.
 */
export const PRE_RLS_MILESTONE: Milestone = {
  id: 'pre-rls',
  evidence: 'MISSING_EVIDENCE',
  sourceCommit: null,
  sqlSha256: null,
  tables: [],
};
