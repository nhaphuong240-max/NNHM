export type DeveloperLeaderboardRow = {
  agencyTenantId: string;
  agencyName: string;
  rank: number;
  dealsClosed: number;
  depositedCount: number;
  gmvVnd: number;
  complianceScore: number;
  penaltyPoints: number;
  status: 'TOP' | 'GOOD' | 'WARNING' | 'PENALIZED';
};

/** UC-MKT-03 · FR-MKT-03 — rank agencies for developer portal */
export function computeDeveloperLeaderboard(
  agencies: {
    tenantId: string;
    name: string;
    depositedCount: number;
    dealsClosed: number;
    gmvVnd: number;
    penaltyPoints: number;
    slaScore: number;
  }[],
): DeveloperLeaderboardRow[] {
  const ranked = agencies
    .map((a) => {
      const complianceScore = Math.max(
        0,
        Math.min(100, Math.round(a.slaScore * 0.4 + Math.min(a.depositedCount, 10) * 4 - a.penaltyPoints)),
      );
      const status: DeveloperLeaderboardRow['status'] =
        a.penaltyPoints >= 20
          ? 'PENALIZED'
          : complianceScore >= 85
            ? 'TOP'
            : complianceScore >= 65
              ? 'GOOD'
              : 'WARNING';
      const score =
        a.depositedCount * 100_000_000 + a.dealsClosed * 50_000_000 + complianceScore * 1_000_000 - a.penaltyPoints * 10_000_000;
      return {
        agencyTenantId: a.tenantId,
        agencyName: a.name,
        rank: 0,
        dealsClosed: a.dealsClosed,
        depositedCount: a.depositedCount,
        gmvVnd: a.gmvVnd,
        complianceScore,
        penaltyPoints: a.penaltyPoints,
        status,
        _score: score,
      };
    })
    .sort((a, b) => b._score - a._score);

  return ranked.map((row, idx) => ({
    agencyTenantId: row.agencyTenantId,
    agencyName: row.agencyName,
    rank: idx + 1,
    dealsClosed: row.dealsClosed,
    depositedCount: row.depositedCount,
    gmvVnd: row.gmvVnd,
    complianceScore: row.complianceScore,
    penaltyPoints: row.penaltyPoints,
    status: row.status,
  }));
}
