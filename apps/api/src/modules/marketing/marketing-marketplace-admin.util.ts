export type MarketplaceAgencyRank = {
  agencyTenantId: string;
  agencyName: string;
  rank: number;
  slaScore: number;
  penaltyPoints: number;
  status: 'GOOD' | 'WARNING' | 'PENALIZED';
  openApplications: number;
  appealStatus?: 'NONE' | 'OPEN' | 'APPROVED';
};

export type MarketplacePenaltyInput = {
  agencyTenantId: string;
  points: number;
  reason: string;
};

/** UC-MKT-04 · FR-MKT-03 — compute ranking from SLA score + penalties */
export function computeMarketplaceRankings(
  agencies: {
    tenantId: string;
    name: string;
    slaScore: number;
    penaltyPoints: number;
    openApplications: number;
    appealStatus?: MarketplaceAgencyRank['appealStatus'];
  }[],
): MarketplaceAgencyRank[] {
  const ranked = agencies
    .map((a) => {
      const netScore = Math.max(0, Math.min(100, a.slaScore - a.penaltyPoints));
      const status: MarketplaceAgencyRank['status'] =
        a.penaltyPoints >= 20 ? 'PENALIZED' : netScore < 70 ? 'WARNING' : 'GOOD';
      return {
        agencyTenantId: a.tenantId,
        agencyName: a.name,
        rank: 0,
        slaScore: a.slaScore,
        penaltyPoints: a.penaltyPoints,
        status,
        openApplications: a.openApplications,
        appealStatus: a.appealStatus ?? 'NONE',
        _net: netScore,
      };
    })
    .sort((a, b) => b._net - a._net);

  return ranked.map((row, idx) => ({
    agencyTenantId: row.agencyTenantId,
    agencyName: row.agencyName,
    rank: idx + 1,
    slaScore: row.slaScore,
    penaltyPoints: row.penaltyPoints,
    status: row.status,
    openApplications: row.openApplications,
    appealStatus: row.appealStatus,
  }));
}
