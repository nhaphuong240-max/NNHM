import { computeMarketplaceRankings } from './marketing-marketplace-admin.util';

describe('marketing-marketplace-admin.util', () => {
  it('ranks agencies by net SLA score', () => {
    const result = computeMarketplaceRankings([
      {
        tenantId: 'ten_a',
        name: 'Agency A',
        slaScore: 90,
        penaltyPoints: 0,
        openApplications: 1,
      },
      {
        tenantId: 'ten_b',
        name: 'Agency B',
        slaScore: 80,
        penaltyPoints: 25,
        openApplications: 0,
      },
    ]);

    expect(result[0]!.agencyTenantId).toBe('ten_a');
    expect(result[1]!.status).toBe('PENALIZED');
  });
});
