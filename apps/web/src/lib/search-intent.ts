/** Map URL intent tab → API transactionType (P0 FR-SRCH-006). */
export function intentToApiTransactionType(intent: string): 'sale' | 'rent' | 'project' | undefined {
  if (intent === 'rent') return 'rent';
  if (intent === 'project') return 'project';
  if (intent === 'buy' || intent === 'sale') return 'sale';
  return undefined;
}
