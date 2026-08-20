import type { ReconciliationStatus } from '../../database/entities/reconciliation-report.entity';

export interface ReconciliationStreakRow {
  date: string;
  status: ReconciliationStatus;
}

/** Consecutive MATCHED days ending at the most recent report date (OP-WIN-02). */
export function computeConsecutiveMatchedStreak(rows: ReconciliationStreakRow[]): number {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const row of sorted) {
    if (row.status === 'MATCHED') streak += 1;
    else break;
  }
  return streak;
}

export function opWin02Passed(streak: number, windowDays = 7): boolean {
  return streak >= windowDays;
}
