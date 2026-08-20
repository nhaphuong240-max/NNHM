import type { UnitEntity } from '../../database/entities/unit.entity';

export type AuditEventRow = {
  id: string;
  action: string;
  payload: Record<string, unknown> | null;
  actorId: string | null;
  createdAt: Date;
};

export type UnitVersionEntry = {
  version: number;
  basePrice: number;
  status: UnitEntity['status'];
  changedAt: string;
  changedBy: string | null;
  reason: string | null;
  action: string;
  auditEventId: string;
};

export type UnitSnapshotResult = {
  unitId: string;
  code: string;
  version: number;
  basePrice: number;
  status: UnitEntity['status'];
  asOf: string;
  matchedAt: string;
  changedBy: string | null;
  reason: string | null;
  source: 'audit_replay' | 'current';
};

function readPatchState(payload: Record<string, unknown>, key: 'before' | 'after') {
  const block = payload[key];
  if (!block || typeof block !== 'object') return null;
  const row = block as Record<string, unknown>;
  if (row.basePrice === undefined || row.status === undefined || row.version === undefined) {
    return null;
  }
  return {
    basePrice: Number(row.basePrice),
    status: String(row.status) as UnitEntity['status'],
    version: Number(row.version),
  };
}

/** Build immutable version timeline from audit PATCH events (UC-GR-05). */
export function buildVersionHistoryFromAudit(
  events: AuditEventRow[],
  current: Pick<UnitEntity, 'basePrice' | 'status' | 'version' | 'updatedAt'>,
): UnitVersionEntry[] {
  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const entries: UnitVersionEntry[] = [];

  for (const event of sorted) {
    const payload = event.payload ?? {};
    if (event.action !== 'PATCH') continue;

    const after = readPatchState(payload, 'after');
    if (!after) continue;

    entries.push({
      version: after.version,
      basePrice: after.basePrice,
      status: after.status,
      changedAt: event.createdAt.toISOString(),
      changedBy: event.actorId,
      reason: typeof payload.reason === 'string' ? payload.reason : null,
      action: event.action,
      auditEventId: event.id,
    });
  }

  const currentPrice = Number(current.basePrice);
  const last = entries[entries.length - 1];
  const currentMismatch =
    !last ||
    last.version !== current.version ||
    last.basePrice !== currentPrice ||
    last.status !== current.status;

  if (currentMismatch) {
    entries.push({
      version: current.version,
      basePrice: currentPrice,
      status: current.status,
      changedAt: current.updatedAt.toISOString(),
      changedBy: null,
      reason: null,
      action: 'CURRENT',
      auditEventId: 'current',
    });
  }

  return entries.sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

/** Point-in-time snapshot — last change at or before `at` (ISO-8601). */
export function snapshotAtTime(
  entries: UnitVersionEntry[],
  at: string,
  unit: Pick<UnitEntity, 'id' | 'code'>,
): UnitSnapshotResult | null {
  const atMs = new Date(at).getTime();
  if (Number.isNaN(atMs)) return null;

  const asc = [...entries].sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  let matched: UnitVersionEntry | null = null;

  for (const entry of asc) {
    if (new Date(entry.changedAt).getTime() <= atMs) {
      matched = entry;
    } else {
      break;
    }
  }

  if (!matched) return null;

  return {
    unitId: unit.id,
    code: unit.code,
    version: matched.version,
    basePrice: matched.basePrice,
    status: matched.status,
    asOf: at,
    matchedAt: matched.changedAt,
    changedBy: matched.changedBy,
    reason: matched.reason,
    source: matched.action === 'CURRENT' ? 'current' : 'audit_replay',
  };
}

export function versionsToCsv(unitCode: string, entries: UnitVersionEntry[]): string {
  const header = ['unit_code', 'version', 'base_price', 'status', 'changed_at', 'changed_by', 'reason', 'action'].join(
    ',',
  );
  const lines = entries.map((row) =>
    [
      unitCode,
      row.version,
      row.basePrice,
      row.status,
      row.changedAt,
      row.changedBy ?? '',
      row.reason ?? '',
      row.action,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header, ...lines].join('\n');
}
