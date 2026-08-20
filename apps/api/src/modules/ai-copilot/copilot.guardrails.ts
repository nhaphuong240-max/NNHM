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

/** FR-AI-03 — block prompts/context that attempt price/inventory mutation via AI */
export function assertCopilotGuardrails(context?: Record<string, unknown>): void {
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
