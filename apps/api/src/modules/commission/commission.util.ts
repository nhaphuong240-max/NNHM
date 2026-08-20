import { createHash } from 'crypto';
import type { CommissionSplitRule } from './commission.types';

export function validateSplitRules(rules: CommissionSplitRule[]): void {
  if (!rules?.length) {
    throw new Error('splitRules must not be empty');
  }

  const primaryCount = rules.filter((r) => r.role === 'PRIMARY').length;
  if (primaryCount !== 1) {
    throw new Error('Exactly one PRIMARY split rule is required');
  }

  for (const rule of rules) {
    if (!rule.recipientId?.trim()) {
      throw new Error('recipientId is required for each split rule');
    }
    if (!Number.isFinite(rule.percent) || rule.percent <= 0) {
      throw new Error('Each split percent must be positive');
    }
  }

  const total = rules.reduce((sum, r) => sum + r.percent, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(`Split rules must sum to 100% (got ${total})`);
  }
}

export function hashPolicySnapshot(input: {
  projectId: string;
  version: number;
  ratePercent: string;
  baseType: string;
  splitRules: CommissionSplitRule[];
}): string {
  const canonical = JSON.stringify({
    projectId: input.projectId,
    version: input.version,
    ratePercent: input.ratePercent,
    baseType: input.baseType,
    splitRules: [...input.splitRules].sort((a, b) => a.role.localeCompare(b.role)),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function recipientTypeForRole(role: CommissionSplitRule['role']): string {
  if (role === 'AGENCY') return 'AGENCY';
  return 'AGENT';
}

export function calculateCommissionAmount(dealAmount: number, ratePercent: number): number {
  return Math.round((dealAmount * ratePercent) / 100);
}
