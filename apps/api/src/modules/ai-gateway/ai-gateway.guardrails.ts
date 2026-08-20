import { ForbiddenException } from '@nestjs/common';

const BLOCKED_MUTATION_KEYS = [
  'basePrice',
  'status',
  'inventory',
  'unitStatus',
  'bookingStatus',
  'priceOverride',
  'mutate',
] as const;

const BLOCKED_PATTERNS = [
  /\b(set|update|change|patch|override)\s+(price|status|inventory|giá|trạng thái)/i,
  /\bbasePrice\s*[:=]/i,
  /\bunit\.status\s*[:=]/i,
];

/** FR-AI-03 — central gateway guardrails (ADR-005). */
export function assertAiGatewayGuardrails(context?: Record<string, unknown>): void {
  if (!context) return;

  for (const key of BLOCKED_MUTATION_KEYS) {
    if (key in context) {
      throw new ForbiddenException({
        detail: `Guardrail FR-AI-03: AI không được thao tác trường ${key}`,
        code: 'AI_GUARDRAIL_BLOCK',
      });
    }
  }

  const serialized = JSON.stringify(context);
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new ForbiddenException({
        detail: 'Guardrail FR-AI-03: phát hiện yêu cầu thay đổi giá/tồn kho qua AI',
        code: 'AI_GUARDRAIL_BLOCK',
      });
    }
  }
}

/** Legal RAG — block answers without corpus hits (hallucination guard). */
export function assertLegalCitationPolicy(hitCount: number, answer: string): void {
  if (hitCount === 0) return;
  if (!answer.includes('Trích dẫn:') && !answer.includes('Tóm tắt')) {
    throw new ForbiddenException({
      detail: 'Guardrail: legal RAG phải trích dẫn corpus khi có hit',
      code: 'AI_LEGAL_CITATION_BLOCK',
    });
  }
}
