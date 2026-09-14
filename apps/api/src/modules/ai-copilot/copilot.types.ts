export type CopilotTask = 'LISTING_DESCRIPTION' | 'LISTING_TITLE' | 'LEAD_SUMMARY';
export type CopilotTone = 'premium' | 'standard' | 'investment';

export const COPILOT_DISCLAIMER =
  'Nội dung AI — cần agent duyệt trước publish (NFR-C04 · BR-06 · BR-16)';

export interface CopilotGenerateInput {
  unitId?: string;
  leadId?: string;
  listingId?: string;
  task: CopilotTask;
  tone?: CopilotTone;
  language?: 'vi' | 'en';
  context?: Record<string, unknown>;
}

export interface ListingCopilotContext {
  unitId: string;
  unitCode: string;
  projectId: string;
  projectName: string;
  bedrooms: number;
  area: number;
  floor: number | null;
  status: string;
  basePrice: number;
  priceDisplay?: number;
}

export interface CopilotGenerateResult {
  id: string;
  attributes: {
    task: CopilotTask;
    title: string;
    content: string;
    summary?: string;
    nextActions?: string[];
    disclaimer: string;
    requiresApproval: true;
    outboundReviewRequired?: boolean;
    modelVersion: string;
    tone?: CopilotTone;
    language: 'vi' | 'en';
    latencyMs: number;
    draftStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}
