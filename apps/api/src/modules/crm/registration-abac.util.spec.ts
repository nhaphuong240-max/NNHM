import { shouldMaskRegistrationPii } from './registration-abac.util';

describe('registration-abac.util', () => {
  const row = {
    registeredBy: 'usr_a',
    registeredByOrgId: 'org_sunrise',
    status: 'ACCEPTED',
  };

  it('masks for agent on another org', () => {
    expect(
      shouldMaskRegistrationPii(row, {
        userId: 'usr_b',
        organizationId: 'org_river',
        role: 'AGENT',
      }),
    ).toBe(true);
  });

  it('does not mask for same org colleague', () => {
    expect(
      shouldMaskRegistrationPii(row, {
        userId: 'usr_b',
        organizationId: 'org_sunrise',
        role: 'AGENT',
      }),
    ).toBe(false);
  });

  it('does not mask for registrant', () => {
    expect(
      shouldMaskRegistrationPii(row, {
        userId: 'usr_a',
        organizationId: 'org_sunrise',
        role: 'AGENT',
      }),
    ).toBe(false);
  });
});
