import type { Milestone } from './schema-classify';

/**
 * The pre-RLS catalog was never reconstructed. The evidence that replaced it
 * is the checked-in baseline migration, addressed by its file hash.
 * Bootstrap stays disabled. An empty isolated database runs this migration;
 * it is not a guessed snapshot.
 */
export const PRE_RLS_MILESTONE: Milestone = {
  id: 'core-baseline',
  evidence: 'VERIFIED',
  sourceCommit: '1738339100000-BaselineCoreSchema.ts',
  sqlSha256: '2f7fa93268b3b389d15792657c91ef907978b0b4b2a2102aad867625b8afec90',
  tables: [],
};
