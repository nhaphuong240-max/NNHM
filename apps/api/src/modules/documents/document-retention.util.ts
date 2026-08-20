/** T7-S4 — vault retention class enforcement (BR-24). */
const RETENTION_YEARS: Record<string, number> = {
  '10Y': 10,
  '5Y': 5,
  '3Y': 3,
};

export function retentionYearsForClass(retentionClass: string): number {
  return RETENTION_YEARS[retentionClass] ?? 5;
}

export function retentionExpiresAt(createdAt: Date, retentionClass: string): Date {
  const years = retentionYearsForClass(retentionClass);
  const expires = new Date(createdAt);
  expires.setUTCFullYear(expires.getUTCFullYear() + years);
  return expires;
}

export function isRetentionExpired(createdAt: Date, retentionClass: string, now = new Date()): boolean {
  return now >= retentionExpiresAt(createdAt, retentionClass);
}

export const RETENTION_POLICY = RETENTION_YEARS;
