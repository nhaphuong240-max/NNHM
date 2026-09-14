import type { CrmActivityEntity } from '../../database/entities/crm-activity.entity';
import type { LeadEntity } from '../../database/entities/lead.entity';
import type { ViewingEntity } from '../../database/entities/viewing.entity';

export const LEAD_COPILOT_MODEL_VERSION = 'lead-copilot-v1-p2-2026';

export type LeadCopilotOutput = {
  summary: string;
  nextActions: string[];
  requiresApproval: true;
  outboundReviewRequired: true;
};

type LeadRequirement = {
  budget?: number;
  timeline?: string;
  loanIntent?: string;
};

/** P2 FR-AI-002 — rule-based lead summary + next action (human review outbound). */
export function generateLeadCopilotBrief(
  lead: LeadEntity,
  viewings: ViewingEntity[],
  activities: CrmActivityEntity[],
): LeadCopilotOutput {
  const req = (lead.requirement ?? {}) as LeadRequirement;
  const parts: string[] = [];

  parts.push(
    `${lead.fullName} (${lead.tier}, intent score ${lead.score}) — nguồn ${lead.source}, stage ${lead.status}.`,
  );

  if (req.budget) {
    parts.push(`Budget khoảng ${(req.budget / 1e9).toFixed(1)} tỷ.`);
  }
  if (req.timeline) {
    parts.push(`Timeline: ${req.timeline}.`);
  }
  if (req.loanIntent) {
    parts.push(`Vay: ${req.loanIntent}.`);
  }
  if (lead.unitId) {
    parts.push(`Quan tâm unit ${lead.unitId}.`);
  }
  if (lead.message?.trim()) {
    parts.push(`Tin nhắn: "${lead.message.trim().slice(0, 120)}${lead.message.length > 120 ? '…' : ''}".`);
  }

  const completedViewings = viewings.filter((v) => v.status === 'COMPLETED').length;
  const pendingViewings = viewings.filter((v) =>
    ['REQUESTED', 'CONFIRMED'].includes(v.status),
  ).length;
  if (viewings.length > 0) {
    parts.push(
      `Viewing: ${completedViewings} hoàn thành, ${pendingViewings} đang chờ/confirm.`,
    );
  }

  const lastAct = activities[0];
  if (lastAct) {
    parts.push(`Activity gần nhất: ${lastAct.type} (${lastAct.summary ?? '—'}).`);
  }

  if (lead.tier === 'HOT' && !lead.firstTouchAt) {
    parts.push('⚠ HOT chưa first-touch — ưu tiên gọi trong SLA.');
  }

  const nextActions: string[] = [];

  if (!lead.firstTouchAt && lead.tier === 'HOT') {
    nextActions.push('Gọi first-touch trong 5 phút giờ hành chính');
  } else if (!req.budget) {
    nextActions.push('Hỏi budget và timeline mua (qualification)');
  } else if (pendingViewings === 0 && completedViewings === 0) {
    nextActions.push('Đề xuất lịch xem nhà phù hợp budget');
  } else if (pendingViewings > 0) {
    nextActions.push('Confirm slot viewing và gửi reminder T-2h');
  } else if (lead.status === 'VIEWING' || completedViewings > 0) {
    nextActions.push('Follow-up sau viewing — ghi outcome + checklist');
  } else {
    nextActions.push('Ghi chú Zalo/call và cập nhật stage pipeline');
  }

  if (lead.healthScore !== null && lead.healthScore < 40) {
    nextActions.push('Health thấp — không loại lead, tăng tần suất nurture');
  }

  return {
    summary: parts.join(' '),
    nextActions,
    requiresApproval: true,
    outboundReviewRequired: true,
  };
}
