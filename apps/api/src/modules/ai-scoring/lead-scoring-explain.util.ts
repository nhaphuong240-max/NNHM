const FEATURE_LABELS: Record<string, string> = {
  source: 'Nguồn lead',
  hasUnitInterest: 'Quan tâm căn cụ thể',
  hasEmail: 'Có email',
  richMessage: 'Tin nhắn chi tiết (≥20 ký tự)',
  campaign: 'Chiến dịch UTM',
  fallback: 'Fallback (model lỗi / chưa chấm)',
};

const SOURCE_IMPACT: Record<string, { delta: number; note: string }> = {
  META_LEAD: { delta: 30, note: 'Lead ads Meta — intent cao' },
  PUBLIC_FORM: { delta: 20, note: 'Form public / landing' },
  PUBLIC_UNIT_DETAIL: { delta: 20, note: 'Form trên trang căn' },
  ZALO_OA: { delta: 25, note: 'Zalo OA inbound' },
  AGENT_REFERRAL: { delta: 10, note: 'Giới thiệu từ agent' },
};

export type LeadScoreExplainFactor = {
  key: string;
  label: string;
  value: unknown;
  impact: number;
  note: string;
};

/** UC-AI-02 — human-readable breakdown from stored features */
export function buildLeadScoreExplainFactors(
  features: Record<string, unknown>,
): LeadScoreExplainFactor[] {
  const factors: LeadScoreExplainFactor[] = [];
  const source = String(features.source ?? 'PUBLIC_FORM');

  factors.push({
    key: 'base',
    label: 'Điểm nền rules engine',
    value: 40,
    impact: 40,
    note: 'Baseline v1 trước khi cộng tín hiệu',
  });

  const sourceImpact = SOURCE_IMPACT[source];
  if (sourceImpact) {
    factors.push({
      key: 'source',
      label: FEATURE_LABELS.source ?? 'Nguồn lead',
      value: source,
      impact: sourceImpact.delta,
      note: sourceImpact.note,
    });
  }

  if (features.hasUnitInterest) {
    factors.push({
      key: 'hasUnitInterest',
      label: FEATURE_LABELS.hasUnitInterest!,
      value: true,
      impact: 15,
      note: 'Lead gắn unitId — intent mua cụ thể',
    });
  }

  if (features.hasEmail) {
    factors.push({
      key: 'hasEmail',
      label: FEATURE_LABELS.hasEmail!,
      value: true,
      impact: 5,
      note: 'Có email liên hệ',
    });
  }

  if (features.richMessage) {
    factors.push({
      key: 'richMessage',
      label: FEATURE_LABELS.richMessage!,
      value: true,
      impact: 5,
      note: 'Nội dung tin nhắn đủ dài',
    });
  }

  if (features.campaign) {
    factors.push({
      key: 'campaign',
      label: FEATURE_LABELS.campaign!,
      value: features.campaign,
      impact: 3,
      note: 'utm_campaign tracking',
    });
  }

  if (features.fallback) {
    factors.push({
      key: 'fallback',
      label: FEATURE_LABELS.fallback!,
      value: features.fallback,
      impact: 0,
      note: 'Không dùng model đầy đủ — provisional score',
    });
  }

  return factors;
}
