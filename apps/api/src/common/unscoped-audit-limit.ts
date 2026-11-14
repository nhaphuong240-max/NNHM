export const UNSCOPED_AUDIT_WINDOW_MS = 60_000;
export const UNSCOPED_AUDIT_MAX_WRITES = 8;
export const UNSCOPED_AUDIT_MAX_KEYS = 256;

type Bucket = { hits: number[]; expiresAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
}

function remember(key: string, bucket: Bucket): void {
  buckets.delete(key);
  buckets.set(key, bucket);
  while (buckets.size > UNSCOPED_AUDIT_MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

/**
 * Limit by source and action. The source is an IP or a connector name.
 * A client-supplied entity id is not part of the key.
 */
export function allowUnscopedAuditWrite(source: string, action: string, now = Date.now()): boolean {
  prune(now);
  const key = `${source.trim().slice(0, 128) || 'unknown'}:${action.trim().slice(0, 32) || 'unknown'}`;
  const hits = (buckets.get(key)?.hits ?? []).filter((at) => now - at < UNSCOPED_AUDIT_WINDOW_MS);
  const expiresAt = now + UNSCOPED_AUDIT_WINDOW_MS;
  if (hits.length >= UNSCOPED_AUDIT_MAX_WRITES) {
    remember(key, { hits, expiresAt });
    return false;
  }
  hits.push(now);
  remember(key, { hits, expiresAt });
  return true;
}

export function unscopedAuditKeyCount(): number {
  return buckets.size;
}

export function resetUnscopedAuditLimit(): void {
  buckets.clear();
}
