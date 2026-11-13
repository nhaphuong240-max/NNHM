const WINDOW_MS = 60_000;
const MAX_WRITES = 8;
const hits = new Map<string, number[]>();

/** Drop repeated unauthenticated audit inserts for the same entity. */
export function allowUnscopedAuditWrite(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_WRITES) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetUnscopedAuditLimit(): void {
  hits.clear();
}
