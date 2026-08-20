/** OP-WIN-07 · UC-CRM-05 — omnichannel ingest SLA (p95 < 30s) */
export const OMNICHANNEL_SLA_MS = 30_000;

export type LatencySummary = {
  sampleCount: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  maxMs: number | null;
  slaTargetMs: number;
  slaPass: boolean;
};

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
}

export function summarizeLatencyMs(values: number[]): LatencySummary {
  const sampleCount = values.length;
  const p95Ms = percentile(values, 95);
  return {
    sampleCount,
    p50Ms: percentile(values, 50),
    p95Ms,
    p99Ms: percentile(values, 99),
    maxMs: sampleCount > 0 ? Math.max(...values) : null,
    slaTargetMs: OMNICHANNEL_SLA_MS,
    slaPass: p95Ms !== null ? p95Ms < OMNICHANNEL_SLA_MS : true,
  };
}

export function parseMetaCreatedTime(payload: Record<string, unknown>): Date | null {
  const raw = payload.created_time;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Date(raw * 1000);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n)) return new Date(n * 1000);
  }
  return null;
}

export function parseZaloEventTime(payload: Record<string, unknown>): Date | null {
  const raw = payload.timestamp;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Date(raw * 1000);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n)) return new Date(n * 1000);
  }
  return null;
}

/** SLA metric: channel event time → CRM sync complete (fallback: row created → processed) */
export function computeSlaMs(
  processedAt: Date,
  rowCreatedAt: Date | null | undefined,
  channelEventAt: Date | null,
): { ingestMs: number; slaMs: number } {
  const receivedMs =
    rowCreatedAt instanceof Date && !Number.isNaN(rowCreatedAt.getTime())
      ? rowCreatedAt.getTime()
      : processedAt.getTime();
  const ingestMs = Math.max(0, processedAt.getTime() - receivedMs);
  const slaMs =
    channelEventAt !== null
      ? Math.max(0, processedAt.getTime() - channelEventAt.getTime())
      : ingestMs;
  return { ingestMs, slaMs };
}
