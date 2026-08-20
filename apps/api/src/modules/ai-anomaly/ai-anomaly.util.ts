import type {
  AnomalyQueueStatus,
  AnomalyRecord,
  AnomalyScanInput,
  AnomalySeverity,
  AnomalySignal,
} from './ai-anomaly.types';

const PRICE_FLAG_RATIO = 0.05;
const PRICE_BLOCK_RATIO = 0.1;

export function buildAnomalyId(listingId: string, primarySignal: string): string {
  return `anom_${listingId}_${primarySignal}`;
}

function bumpSeverity(current: AnomalySeverity, next: AnomalySeverity): AnomalySeverity {
  const rank: Record<AnomalySeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return rank[next] > rank[current] ? next : current;
}

function severityFromScore(score: number): AnomalySeverity {
  if (score >= 85) return 'CRITICAL';
  if (score >= 65) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/** UC-AI-05 · FR-AI-08 — rule-based ML stub for listing anomaly queue */
export function scanListingAnomaly(input: AnomalyScanInput): AnomalyRecord | null {
  const signals: AnomalySignal[] = [];
  let mlScore = 0;

  const priceDisplay = input.listing.priceDisplay ? Number(input.listing.priceDisplay) : undefined;
  const basePrice = Number(input.unit.basePrice);

  if (priceDisplay !== undefined && basePrice > 0) {
    const ratio = Math.abs(priceDisplay - basePrice) / basePrice;
    if (ratio > PRICE_BLOCK_RATIO) {
      signals.push({
        code: 'PRICE_DRIFT_BLOCK',
        label: 'Giá lệch GR >10%',
        severity: 'CRITICAL',
        score: 90,
        detail: `Listing ${priceDisplay.toLocaleString('vi-VN')} vs GR ${basePrice.toLocaleString('vi-VN')} VND`,
      });
      mlScore += 90;
    } else if (ratio > PRICE_FLAG_RATIO) {
      signals.push({
        code: 'PRICE_DRIFT_FLAG',
        label: 'Giá lệch GR >5%',
        severity: 'HIGH',
        score: 65,
        detail: `Chênh lệch ${Math.round(ratio * 1000) / 10}% so với Golden Record`,
      });
      mlScore += 65;
    }
  }

  if (input.listing.antiDriftStatus === 'BLOCK') {
    signals.push({
      code: 'ANTI_DRIFT_BLOCK',
      label: 'Anti-drift BLOCK',
      severity: 'CRITICAL',
      score: 80,
      detail: 'Listing bị chặn publish do drift so với GR',
    });
    mlScore += 80;
  } else if (input.listing.antiDriftStatus === 'FLAG') {
    signals.push({
      code: 'ANTI_DRIFT_FLAG',
      label: 'Anti-drift FLAG',
      severity: 'MEDIUM',
      score: 45,
      detail: 'Cần ops review trước khi publish',
    });
    mlScore += 45;
  }

  if (input.duplicateCountOnUnit > 1) {
    signals.push({
      code: 'DUPLICATE_UNIT',
      label: 'Trùng unit trên nhiều listing',
      severity: 'HIGH',
      score: 70,
      detail: `${input.duplicateCountOnUnit} listing cùng unit ${input.unit.code}`,
    });
    mlScore += 70;
  }

  if (input.unit.status !== 'AVAILABLE' && input.listing.status === 'PUBLISHED') {
    signals.push({
      code: 'UNIT_NOT_AVAILABLE',
      label: 'Unit GR không AVAILABLE',
      severity: 'CRITICAL',
      score: 85,
      detail: `Unit ${input.unit.code} đang ${input.unit.status} nhưng listing vẫn PUBLISHED`,
    });
    mlScore += 85;
  }

  if (signals.length === 0) return null;

  const primary = signals.sort((a, b) => b.score - a.score)[0]!;
  let severity: AnomalySeverity = 'LOW';
  for (const s of signals) {
    severity = bumpSeverity(severity, s.severity);
  }

  const cappedScore = Math.min(100, Math.round(mlScore / signals.length));
  const slaHours = Number(process.env.ANTI_DRIFT_OPS_SLA_HOURS ?? 4);
  const hasBlock = signals.some((s) => s.code === 'ANTI_DRIFT_BLOCK' || s.code === 'PRICE_DRIFT_BLOCK');

  return {
    id: buildAnomalyId(input.listing.id, primary.code),
    listingId: input.listing.id,
    unitId: input.listing.unitId,
    unitCode: input.unit.code,
    title: input.listing.title,
    listingStatus: input.listing.status,
    signals,
    mlScore: cappedScore,
    severity: severityFromScore(cappedScore),
    queueStatus: 'OPEN',
    flaggedAt: input.listing.createdAt.toISOString(),
    slaDeadlineAt: hasBlock
      ? new Date(input.listing.createdAt.getTime() + slaHours * 60 * 60 * 1000).toISOString()
      : undefined,
  };
}

export function applyQueueStatus(
  record: AnomalyRecord,
  status: AnomalyQueueStatus,
  meta?: { note?: string; resolvedAt?: string; resolvedBy?: string },
): AnomalyRecord {
  return {
    ...record,
    queueStatus: status,
    resolutionNote: meta?.note,
    resolvedAt: meta?.resolvedAt,
    resolvedBy: meta?.resolvedBy,
  };
}
