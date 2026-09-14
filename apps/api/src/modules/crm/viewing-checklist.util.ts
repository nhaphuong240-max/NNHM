/** P1 FR-VIEW-003b — mandatory viewing checklist items. */
export const VIEWING_CHECKLIST_KEYS = [
  'customer_id_verified',
  'unit_condition_walked',
  'budget_confirmed',
  'next_step_agreed',
] as const;

export type ViewingChecklistKey = (typeof VIEWING_CHECKLIST_KEYS)[number];

export function assertViewingChecklistComplete(checklist: Record<string, boolean> | null | undefined) {
  const missing = VIEWING_CHECKLIST_KEYS.filter((k) => !checklist?.[k]);
  return { complete: missing.length === 0, missing };
}

export function nextTaskForOutcome(outcome: string): string | null {
  if (outcome === 'COMPLETED_INTERESTED') return 'Schedule booking / deposit discussion';
  if (outcome === 'COMPLETED_NEEDS_OPTIONS') return 'Send alternative units within 48h';
  if (outcome === 'PRICE_OBJECTION') return 'Prepare price comparison sheet';
  if (outcome === 'FINANCE_OBJECTION') return 'Connect bank pre-approval partner';
  if (outcome === 'LEGAL_CONCERN') return 'Escalate to legal disclaimer review';
  return null;
}
