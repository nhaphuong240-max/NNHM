import type { CrmActivityEntity, CrmActivityType } from '../../database/entities/crm-activity.entity';
import type {
  LeadEntity,
  LeadScoreStatus,
  LeadStatus,
  LeadTier,
} from '../../database/entities/lead.entity';
import { PROVISIONAL_LEAD_SCORE } from '../ai-scoring/lead-scoring.engine';

export const PIPELINE_STAGES: { code: LeadStatus; label: string }[] = [
  { code: 'NEW', label: 'Mới' },
  { code: 'CONTACTED', label: 'Đã liên hệ' },
  { code: 'VIEWING', label: 'Xem nhà' },
  { code: 'NEGOTIATING', label: 'Đàm phán' },
  { code: 'BOOKING', label: 'Booking' },
  { code: 'WON', label: 'Thành công' },
  { code: 'LOST', label: 'Thất bại' },
];

export const LOST_REASONS = [
  'NO_BUDGET',
  'NO_RESPONSE',
  'BOUGHT_ELSEWHERE',
  'OTHER',
] as const;

export type LostReason = (typeof LOST_REASONS)[number];

const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'VIEWING', 'LOST'],
  CONTACTED: ['NEW', 'VIEWING', 'NEGOTIATING', 'LOST'],
  VIEWING: ['CONTACTED', 'NEGOTIATING', 'BOOKING', 'LOST'],
  NEGOTIATING: ['VIEWING', 'BOOKING', 'WON', 'LOST'],
  BOOKING: ['NEGOTIATING', 'WON', 'LOST'],
  WON: [],
  LOST: ['NEW'],
};

export interface CreateLeadInput {
  fullName: string;
  phone: string;
  email?: string;
  source?: string;
  unitId?: string;
  listingId?: string;
  message?: string;
  consent?: {
    privacyAccepted?: boolean;
    marketing?: boolean;
    privacyPolicyVersion?: string;
  };
  utm?: Record<string, string>;
  /** Platform campaign id when known (Meta lead ads, etc.) */
  campaignId?: string;
  channelMeta?: Record<string, unknown>;
}

export interface PatchLeadInput {
  stage?: LeadStatus;
  lostReason?: string;
  unitId?: string;
  notes?: string;
}

export interface CreateActivityInput {
  leadId: string;
  type: CrmActivityType;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface LeadRecord {
  id: string;
  attributes: {
    fullName: string;
    phone: string;
    score: number;
    tier: LeadTier;
    source: string;
    status: LeadStatus;
    routingStatus: string;
    scoreStatus?: LeadScoreStatus;
    assignedTo?: string;
    scoringMeta?: Record<string, unknown> | null;
    channelMeta?: Record<string, unknown> | null;
    unitId?: string;
    utmCampaign?: string | null;
    campaignId?: string | null;
    lostReason?: string;
    lastActivityAt?: string;
    updatedAt: string;
  };
}

export interface ActivityRecord {
  id: string;
  attributes: {
    leadId: string;
    type: CrmActivityType;
    summary?: string;
    metadata?: Record<string, unknown> | null;
    createdBy?: string | null;
    createdAt: string;
  };
}

export interface CreateLeadResult {
  data: LeadRecord;
  meta?: { idempotentReplay?: boolean };
}

export function mapLeadEntity(row: LeadEntity): LeadRecord {
  return {
    id: row.id,
    attributes: {
      fullName: row.fullName,
      phone: row.phone,
      score: row.score,
      tier: row.tier,
      source: row.source,
      status: row.status,
      routingStatus: row.routingStatus,
      scoreStatus: row.scoreStatus,
      assignedTo: row.assignedTo ?? undefined,
      scoringMeta: row.scoringMeta,
      channelMeta: row.channelMeta,
      unitId: row.unitId ?? undefined,
      utmCampaign: row.utmCampaign,
      campaignId: row.campaignId,
      lostReason: row.lostReason ?? undefined,
      lastActivityAt: row.lastActivityAt?.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

export function mapActivityEntity(row: CrmActivityEntity): ActivityRecord {
  return {
    id: row.id,
    attributes: {
      leadId: row.leadId,
      type: row.type,
      summary: row.summary ?? undefined,
      metadata: row.metadata,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

export { PROVISIONAL_LEAD_SCORE };

export function assertStageTransition(from: LeadStatus, to: LeadStatus): void {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid stage transition ${from} → ${to}`);
  }
}

export function isPipelineStage(value: string): value is LeadStatus {
  return PIPELINE_STAGES.some((s) => s.code === value);
}

export function isActivityType(value: string): value is CrmActivityType {
  return ['CALL', 'NOTE', 'VISIT', 'ZALO', 'MEETING'].includes(value);
}

export interface LeadImportPreviewInput {
  csvText: string;
  columnMap?: Partial<Record<'fullName' | 'phone' | 'email' | 'unitId' | 'message', string>>;
}

export interface LeadImportCommitInput {
  rows: {
    fullName: string;
    phone: string;
    email?: string;
    unitId?: string;
    message?: string;
  }[];
  defaultSource?: string;
  skipDuplicates?: boolean;
  assignTo?: string;
}

export interface LeadImportPreviewRow {
  rowNumber: number;
  fullName: string;
  phone: string;
  email?: string;
  unitId?: string;
  message?: string;
  valid: boolean;
  errors: string[];
  duplicatePhone?: boolean;
}
