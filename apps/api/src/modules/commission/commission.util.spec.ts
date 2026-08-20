import { calculateCommissionAmount, hashPolicySnapshot, validateSplitRules } from './commission.util';
import type { CommissionSplitRule } from './commission.types';

describe('commission.util', () => {
  const rules: CommissionSplitRule[] = [
    { role: 'PRIMARY', recipientId: 'usr_agent_01', percent: 70 },
    { role: 'AGENCY', recipientId: 'agcy_sunrise', percent: 30 },
  ];

  it('validates split rules sum to 100% with one PRIMARY', () => {
    expect(() => validateSplitRules(rules)).not.toThrow();
  });

  it('rejects split rules not summing to 100%', () => {
    expect(() =>
      validateSplitRules([
        { role: 'PRIMARY', recipientId: 'usr_agent_01', percent: 60 },
        { role: 'AGENCY', recipientId: 'agcy_sunrise', percent: 30 },
      ]),
    ).toThrow(/100%/);
  });

  it('creates stable policy hash for snapshot (BR-13)', () => {
    const hashA = hashPolicySnapshot({
      projectId: 'prj_sunrise',
      version: 1,
      ratePercent: '2.500',
      baseType: 'DEPOSIT',
      splitRules: rules,
    });
    const hashB = hashPolicySnapshot({
      projectId: 'prj_sunrise',
      version: 1,
      ratePercent: '2.500',
      baseType: 'DEPOSIT',
      splitRules: rules,
    });
    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('calculates commission amount from deal value', () => {
    expect(calculateCommissionAmount(50_000_000, 2.5)).toBe(1_250_000);
  });
});
