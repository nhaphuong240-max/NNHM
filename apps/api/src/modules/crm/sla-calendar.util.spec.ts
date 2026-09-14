import { DEFAULT_TENANT_DEMAND_POLICY } from './demand-policy.types';
import { isBusinessTime } from './sla-calendar.util';

describe('sla-calendar.util', () => {
  const sla = DEFAULT_TENANT_DEMAND_POLICY.sla;

  it('returns true during weekday business hours VN', () => {
    // Monday 10:00 ICT — 2026-09-14 is Monday
    const at = new Date('2026-09-14T03:00:00.000Z'); // 10:00 +7
    expect(isBusinessTime(at, sla)).toBe(true);
  });

  it('returns false on Sunday', () => {
    const at = new Date('2026-09-13T03:00:00.000Z'); // Sunday 10:00 ICT
    expect(isBusinessTime(at, sla)).toBe(false);
  });

  it('returns false on holiday', () => {
    const policy = {
      ...DEFAULT_TENANT_DEMAND_POLICY,
      sla: { ...sla, holidayDates: ['2026-09-14'] },
    };
    const at = new Date('2026-09-14T03:00:00.000Z');
    expect(isBusinessTime(at, policy.sla)).toBe(false);
  });
});
