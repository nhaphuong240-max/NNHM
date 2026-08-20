import type { LeadRecord } from '../../lib/api';
import { brand } from '../../theme/tokens';

export const SLA_HOURS = 48;
/** TC-12 — aligned with api lead-scoring.engine HOT_SCORE_MIN */
export const HOT_SCORE_MIN = 85;
export const PENDING_POLL_MS = 2000;

export function tierColor(tier: string) {
  if (tier === 'HOT') return brand.destructive;
  if (tier === 'WARM') return brand.warning;
  return brand.muted;
}

export function formatRelativeTime(iso?: string) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function isOverdue(lead: LeadRecord) {
  const stage = lead.attributes.status;
  if (!['NEW', 'CONTACTED'].includes(stage)) return false;
  const ref = lead.attributes.lastActivityAt ?? lead.attributes.updatedAt;
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() > SLA_HOURS * 60 * 60 * 1000;
}

export function isHotLead(lead: LeadRecord) {
  return lead.attributes.tier === 'HOT' || lead.attributes.score >= HOT_SCORE_MIN;
}

export function hasPendingScoring(leads: LeadRecord[]) {
  return leads.some((l) => l.attributes.scoreStatus === 'PENDING');
}

export function stageLabel(code: string) {
  const map: Record<string, string> = {
    NEW: 'Mới',
    CONTACTED: 'Đã liên hệ',
    VIEWING: 'Xem nhà',
    NEGOTIATING: 'Đàm phán',
    BOOKING: 'Booking',
    WON: 'Thành công',
    LOST: 'Thất bại',
  };
  return map[code] ?? code;
}
