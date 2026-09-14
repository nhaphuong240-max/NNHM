import type { LeadEntity } from '../../database/entities/lead.entity';
import type { ViewingEntity } from '../../database/entities/viewing.entity';

export type HealthFactor = {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  note: string;
};

export type LeadHealthResult = {
  healthScore: number;
  factors: HealthFactor[];
  disclaimer: string;
};

const DISCLAIMER =
  'Health score chỉ hỗ trợ ưu tiên — không dùng để tự động từ chối lead (FR-LEAD-007b).';

/** P2 FR-LEAD-007b — explainable health from recency, viewing, budget, SLA. */
export function computeLeadHealth(
  lead: LeadEntity,
  viewings: ViewingEntity[],
  unitPrice?: number | null,
): LeadHealthResult {
  const factors: HealthFactor[] = [];
  let total = 0;

  // Recency (0–30)
  const now = Date.now();
  const lastAct = lead.lastActivityAt ?? lead.updatedAt ?? lead.createdAt;
  const daysSince = (now - lastAct.getTime()) / (1000 * 60 * 60 * 24);
  let recencyScore = 30;
  if (daysSince > 14) recencyScore = 5;
  else if (daysSince > 7) recencyScore = 15;
  else if (daysSince > 3) recencyScore = 22;
  factors.push({
    key: 'recency',
    label: 'Độ mới tương tác',
    score: recencyScore,
    maxScore: 30,
    note:
      daysSince <= 3
        ? 'Hoạt động trong 3 ngày gần đây'
        : daysSince <= 7
          ? 'Hoạt động trong tuần qua'
          : daysSince <= 14
            ? 'Im lặng 1–2 tuần'
            : 'Im lặng > 14 ngày — cần follow-up',
  });
  total += recencyScore;

  // Viewing engagement (0–30)
  const completed = viewings.filter((v) => v.status === 'COMPLETED').length;
  const confirmed = viewings.filter((v) => v.status === 'CONFIRMED').length;
  let viewingScore = 0;
  if (completed >= 1) viewingScore = 30;
  else if (confirmed >= 1) viewingScore = 20;
  else if (viewings.length > 0) viewingScore = 10;
  factors.push({
    key: 'viewing',
    label: 'Lịch xem nhà',
    score: viewingScore,
    maxScore: 30,
    note:
      completed >= 1
        ? `${completed} lần xem hoàn thành`
        : confirmed >= 1
          ? 'Đã confirm slot xem'
          : viewings.length > 0
            ? 'Có yêu cầu xem, chưa confirm'
            : 'Chưa có viewing',
  });
  total += viewingScore;

  // Budget match (0–25)
  const req = (lead.requirement ?? {}) as { budget?: number };
  let budgetScore = 0;
  if (req.budget && req.budget > 0) {
    budgetScore = 15;
    if (unitPrice && unitPrice > 0) {
      const ratio = req.budget / unitPrice;
      if (ratio >= 0.9 && ratio <= 1.2) budgetScore = 25;
      else if (ratio >= 0.7) budgetScore = 20;
      else budgetScore = 10;
    }
  }
  factors.push({
    key: 'budget',
    label: 'Budget vs căn quan tâm',
    score: budgetScore,
    maxScore: 25,
    note: req.budget
      ? unitPrice
        ? `Budget ${(req.budget / 1e9).toFixed(1)} tỷ vs giá căn ${(unitPrice / 1e9).toFixed(1)} tỷ`
        : `Đã khai budget ${(req.budget / 1e9).toFixed(1)} tỷ`
      : 'Chưa khai budget',
  });
  total += budgetScore;

  // SLA compliance (0–15)
  let slaScore = 15;
  if (lead.tier === 'HOT') {
    if (lead.hotSlaBreached) slaScore = 0;
    else if (!lead.firstTouchAt && lead.hotSlaDueAt && lead.hotSlaDueAt < new Date()) slaScore = 5;
    else if (!lead.firstTouchAt) slaScore = 8;
  }
  factors.push({
    key: 'sla',
    label: 'SLA first-touch (HOT)',
    score: slaScore,
    maxScore: 15,
    note:
      lead.tier !== 'HOT'
        ? 'Không áp SLA HOT'
        : lead.hotSlaBreached
          ? 'Đã breach SLA — cần escalate'
          : lead.firstTouchAt
            ? 'Đã first-touch đúng hạn'
            : 'Chưa first-touch',
  });
  total += slaScore;

  return {
    healthScore: Math.min(100, Math.max(0, total)),
    factors,
    disclaimer: DISCLAIMER,
  };
}
