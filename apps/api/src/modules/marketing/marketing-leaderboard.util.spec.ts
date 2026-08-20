import { computeDeveloperLeaderboard } from './marketing-leaderboard.util';

describe('computeDeveloperLeaderboard', () => {
  it('ranks agency with more deposits higher', () => {
    const rows = computeDeveloperLeaderboard([
      {
        tenantId: 'ten_agency_01',
        name: 'Sunrise Agency',
        depositedCount: 5,
        dealsClosed: 2,
        gmvVnd: 250_000_000,
        penaltyPoints: 0,
        slaScore: 90,
      },
      {
        tenantId: 'ten_agency_02',
        name: 'Metro Realty',
        depositedCount: 1,
        dealsClosed: 0,
        gmvVnd: 50_000_000,
        penaltyPoints: 5,
        slaScore: 70,
      },
    ]);

    expect(rows[0]?.agencyTenantId).toBe('ten_agency_01');
    expect(rows[0]?.rank).toBe(1);
    expect(rows[0]?.complianceScore).toBeGreaterThan(rows[1]?.complianceScore ?? 0);
    expect(rows[0]?.status).toBe('WARNING');
  });
});
