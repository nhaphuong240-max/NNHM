/** ADR-005 — LLM provider abstraction (Phase 1 NestJS gateway). */

export type AiGatewayTask =
  | 'LISTING_DESCRIPTION'
  | 'LISTING_TITLE'
  | 'LEAD_SCORE'
  | 'LEGAL_RAG';

export type CompletionParams = {
  task: AiGatewayTask;
  tenantId: string;
  prompt: string;
  context?: Record<string, unknown>;
  tone?: string;
  language?: string;
};

export type CompletionResult = {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  requiresApproval: boolean;
  disclaimer: string;
  citations?: { documentId?: string; title: string; source: string }[];
};

export interface LLMProvider {
  readonly name: string;
  complete(params: CompletionParams): Promise<CompletionResult>;
}

export const AI_GATEWAY_VERSION = 'wereal-ai-gateway-v1-t7s7';
export const AI_GATEWAY_DISCLAIMER = 'Nội dung AI — cần agent duyệt trước publish';
