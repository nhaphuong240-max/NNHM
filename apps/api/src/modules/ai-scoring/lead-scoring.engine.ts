import type { LeadTier } from '../../database/entities/lead.entity';

export const SCORING_MODEL_VERSION = 'rules-v1-p2-2026';

/** TC-12 / ADR — single HOT threshold for engine + UI + routing */
export const HOT_SCORE_MIN = 85;

export const PROVISIONAL_LEAD_SCORE = 50;

export type LeadScoringInput = {
  source?: string;
  unitId?: string;
  email?: string;
  message?: string;
  utm?: Record<string, string>;
};

export type LeadScoringResult = {
  score: number;
  tier: LeadTier;
  modelVersion: string;
  features: Record<string, unknown>;
  unscored: boolean;
};

/** UC-AI-02 model v1 — rules engine (ML-ready interface) */
export function inferLeadScore(input: LeadScoringInput): LeadScoringResult {
  let score = 40;
  const source = input.source ?? 'PUBLIC_FORM';
  const features: Record<string, unknown> = { source };

  if (source === 'META_LEAD') score += 30;
  if (source === 'ZALO_OA') score += 25;
  if (source === 'SMS_GATEWAY') score += 15;
  if (source === 'PUBLIC_FORM' || source === 'PUBLIC_UNIT_DETAIL') score += 20;
  if (source === 'AGENT_REFERRAL') score += 10;
  if (input.unitId) {
    score += 15;
    features.hasUnitInterest = true;
  }
  if (input.email?.trim()) {
    score += 5;
    features.hasEmail = true;
  }
  if (input.message && input.message.trim().length >= 20) {
    score += 5;
    features.richMessage = true;
  }
  if (input.utm?.utm_campaign) {
    score += 3;
    features.campaign = input.utm.utm_campaign;
  }

  score = Math.min(100, Math.max(0, score));
  const tier: LeadTier =
    score >= HOT_SCORE_MIN ? 'HOT' : score >= 60 ? 'WARM' : 'NEW';

  return {
    score,
    tier,
    modelVersion: SCORING_MODEL_VERSION,
    features,
    unscored: false,
  };
}

export function fallbackLeadScore(reason: string): LeadScoringResult {
  return {
    score: PROVISIONAL_LEAD_SCORE,
    tier: 'NEW',
    modelVersion: SCORING_MODEL_VERSION,
    features: { fallback: reason },
    unscored: true,
  };
}

export function isHotTier(tier: LeadTier) {
  return tier === 'HOT';
}
