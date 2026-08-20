export type { AdminDashboardAttributes } from '../analytics/analytics.types';

export type DeveloperDashboardAttributes = {
  inventory: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    hold: number;
    absorptionRate: number;
  };
  listings: {
    published: number;
  };
  commission: {
    policies: number;
  };
  previewUnits: {
    id: string;
    code: string;
    floor: number | null;
    area: number;
    basePrice: number;
    status: string;
    version: number;
  }[];
};

export type BuyerDealStep = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

export type BuyerDealNotification = {
  id: string;
  channel: 'IN_APP' | 'SMS' | 'ZNS';
  title: string;
  body: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
};

export type BuyerDealSummary = {
  id: string;
  status: string;
  unitId: string;
  unitCode: string;
  leadId?: string;
  depositAmount?: number;
  expiresAt: string;
  createdAt: string;
  currentStep: string;
};

export type BuyerDealDetail = BuyerDealSummary & {
  allowedTransitions: string[];
  steps: BuyerDealStep[];
  paymentIntentId?: string;
  notes?: string;
  notifications: BuyerDealNotification[];
};

export type OmnichannelLatencyStats = {
  sampleCount: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  maxMs: number | null;
  slaTargetMs: number;
  slaPass: boolean;
};

export type OmnichannelChannelStats = {
  processed: number;
  failed: number;
  duplicate: number;
  processing: number;
  last24h: number;
  last7d: number;
  successRate: number;
  latency?: OmnichannelLatencyStats;
};

export type OmnichannelSyncEvent = {
  id: string;
  channel: 'META' | 'ZALO';
  externalId: string;
  status: string;
  leadId?: string | null;
  createdAt: string;
  lastError?: string | null;
  ingestMs?: number | null;
  slaMs?: number | null;
};

export type OmnichannelDashboardAttributes = {
  summary: {
    totalSynced: number;
    totalFailed: number;
    totalDuplicate: number;
    successRate: number;
    crmLeadsFromChannels: number;
    last24h: number;
    last7d: number;
    latency: OmnichannelLatencyStats;
    opWin07Pass: boolean;
  };
  meta: OmnichannelChannelStats & {
    pagesConnected: number;
    pages: { id: string; pageId: string; pageName: string }[];
  };
  zalo: OmnichannelChannelStats & {
    oasConnected: number;
    znsSent: number;
    znsFailed: number;
    oas: { id: string; oaId: string; oaName: string; hasToken: boolean }[];
  };
  crmAttribution: {
    metaLeads: number;
    zaloLeads: number;
    otherLeads: number;
  };
  recentSync: OmnichannelSyncEvent[];
  recentZns: {
    id: string;
    templateId: string;
    phone: string;
    status: string;
    createdAt: string;
  }[];
};
