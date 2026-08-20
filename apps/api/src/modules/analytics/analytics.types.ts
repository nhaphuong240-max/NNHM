export type AdminDashboardAttributes = {
  funnel: {
    leads: number;
    bookings: number;
    deposited: number;
    conversionRate: number;
  };
  leadsByStatus: Record<string, number>;
  moderation: {
    pendingReview: number;
    published: number;
    draft: number;
    rejected: number;
  };
  pendingListings: {
    id: string;
    unitId: string;
    unitCode: string;
    title: string;
    antiDriftStatus: string;
    createdAt: string;
  }[];
  integrations: {
    metaProcessed: number;
    metaFailed: number;
    zaloProcessed: number;
    zaloFailed: number;
    znsSent: number;
  };
  ops: {
    kycPending: number;
    auditEvents7d: number;
  };
  hotConversion?: {
    hotTotal: number;
    hotContacted: number;
    hotBooked: number;
    hotDeposited: number;
    hotConversionRate: number;
    hotResponseSlaMs: number | null;
  };
};

export type GmvReportAttributes = {
  period: { from: string; to: string };
  depositGmv: number;
  paymentGmv: number;
  totalGmv: number;
  depositedBookings: number;
  succeededPayments: number;
  byMonth: { month: string; depositGmv: number; paymentGmv: number }[];
  recentDeposits: {
    bookingId: string;
    unitId: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
};

export type AbsorptionReportAttributes = {
  projectId: string | null;
  inventory: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    hold: number;
    absorptionRate: number;
  };
  statusBreakdown: Record<string, number>;
  inventoryValue: {
    availableBasePrice: number;
    soldBasePrice: number;
  };
  previewUnits: {
    id: string;
    code: string;
    status: string;
    basePrice: number;
    area: number;
  }[];
};

export type ForecastReportAttributes = {
  projectId: string | null;
  horizonMonths: number;
  current: AbsorptionReportAttributes['inventory'];
  monthlySoldRate: number;
  projections: {
    label: string;
    month: string;
    projectedSold: number;
    projectedAvailable: number;
    absorptionRate: number;
  }[];
  disclaimer: string;
};

export type AttributionReportAttributes = {
  period: { from: string; to: string };
  totalLeads: number;
  attributedLeads: number;
  attributionRate: number;
  bySource: { source: string; leads: number; share: number }[];
  byCampaign: {
    campaignKey: string;
    utmCampaign: string | null;
    campaignId: string | null;
    leads: number;
    share: number;
  }[];
  bySourceCampaign: {
    source: string;
    utmCampaign: string | null;
    campaignId: string | null;
    leads: number;
  }[];
};
