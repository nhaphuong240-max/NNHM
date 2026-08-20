import { computeSlaBucket, idleHours, SLA_HOURS } from './crm-sla.util';

describe('crm-sla.util', () => {
  const base = {
    status: 'CONTACTED' as const,
    updatedAt: new Date(),
    lastActivityAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
  };

  it('marks lead overdue after SLA hours', () => {
    expect(computeSlaBucket(base)).toBe('overdue');
    expect(idleHours(base)).toBeGreaterThan(SLA_HOURS);
  });

  it('marks due soon between 36-48h idle', () => {
    const lead = {
      ...base,
      lastActivityAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
    };
    expect(computeSlaBucket(lead)).toBe('due_soon');
  });

  it('ignores non-tracked stages', () => {
    expect(computeSlaBucket({ ...base, status: 'WON' })).toBeNull();
  });
});
