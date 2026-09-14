import { getSession, type AuthSession } from './auth';
import { DEFAULT_TENANT_ID, PRIVACY_POLICY_VERSION } from './constants';

export { DEFAULT_TENANT_ID, PRIVACY_POLICY_VERSION };

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export type SearchHit = {
  id: string;
  listingId?: string;
  attributes: {
    code: string;
    projectName: string;
    projectId?: string;
    basePrice: number;
    bedrooms: number;
    area: number;
    title: string;
    verified: boolean;
    thumbnailUrl: string | null;
    city?: string | null;
    district?: string | null;
  };
};

export type SearchResponse = {
  data: SearchHit[];
  meta: {
    count: number;
    zeroResult?: boolean;
    suggestions?: {
      label: string;
      params: Record<string, unknown>;
    }[];
    facets?: {
      bedrooms?: { value: number; count: number }[];
      districts?: { value: string; count: number }[];
    };
  };
};

export async function trackAnalyticsEvent(input: {
  name: string;
  visitorId?: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
}) {
  await fetch(`${API_BASE}/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEFAULT_TENANT_ID },
    body: JSON.stringify({ ...input, source: 'web' }),
  }).catch(() => undefined);
}

export async function fetchCrmToday() {
  const res = await authFetch(`${API_BASE}/crm/today`);
  if (!res.ok) throw new Error(`Today failed: ${res.status}`);
  return res.json() as Promise<{
    data: {
      attributes: {
        slaApplicable: boolean;
        hotFirstTouchMinutes: number;
        overdueCount: number;
        hotCount: number;
        queue: Array<Record<string, unknown>>;
      };
    };
  }>;
}

export type CrmKpiPack = {
  northStarQualifiedViewingsPerWeek: number;
  zeroResultRate: number | null;
  hotFirstTouchRate: number | null;
  viewingShowUpRate: number | null;
  bookingLeadLinkRate: number | null;
  listingFreshnessRate: number | null;
  activeRegistrations: number;
  openDisputes: number;
  closedDisputes7d: number;
  searchSubmittedTotal: number;
  projectId: string | null;
  targets: {
    zeroResultRateMax: number;
    hotFirstTouchP95Minutes: number;
    viewingShowUpMin: number;
    bookingLeadLinkMin: number;
    listingFreshnessMin: number;
  };
  notes: {
    searchP95: string;
    detailToContact: string;
  };
};

export async function fetchCrmKpi(projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await authFetch(`${API_BASE}/crm/kpi${qs}`);
  if (!res.ok) throw new Error(`KPI failed: ${res.status}`);
  return res.json() as Promise<{ data: { attributes: CrmKpiPack } }>;
}

export async function escalateHotLead(leadId: string, reason?: string) {
  const res = await authFetch(`${API_BASE}/crm/sla/leads/${leadId}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`Escalate failed: ${res.status}`);
  return res.json();
}

export async function openDealDispute(registrationId: string, summary?: string) {
  const res = await authFetch(`${API_BASE}/disputes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId, summary }),
  });
  if (!res.ok) throw new Error(`Dispute failed: ${res.status}`);
  return res.json();
}

export async function requestSeekerOtp(phone: string, visitorId?: string) {
  const res = await fetch(`${API_BASE}/auth/seeker/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEFAULT_TENANT_ID },
    body: JSON.stringify({ phone, visitorId }),
  });
  if (!res.ok) throw new Error(`OTP request failed: ${res.status}`);
  return res.json() as Promise<{ data: { challengeId: string; expiresIn: number } }>;
}

export async function verifySeekerOtp(input: {
  challengeId: string;
  code: string;
  phone: string;
  visitorId?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/seeker/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEFAULT_TENANT_ID },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`OTP verify failed: ${res.status}`);
  return res.json() as Promise<{ data: { accessToken: string; userId: string } }>;
}

export async function searchUnits(params: {
  q?: string;
  district?: string;
  city?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  transactionType?: 'sale' | 'rent' | 'project';
  sort?: 'relevance' | 'newest' | 'price' | 'area' | 'verified_first';
}): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.district) qs.set('district', params.district);
  if (params.city) qs.set('city', params.city);
  if (params.bedrooms !== undefined) qs.set('bedrooms', String(params.bedrooms));
  if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.transactionType) qs.set('transactionType', params.transactionType);
  if (params.sort) qs.set('sort', params.sort);

  const res = await fetch(`${API_BASE}/search/units?${qs.toString()}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function fetchSearchStats() {
  const res = await fetch(`${API_BASE}/search/stats`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Stats failed: ${res.status}`);
  return res.json() as Promise<{
    data: { totalListings: number; verifiedListings: number; lastIndexedAt: string | null };
  }>;
}

export type ProjectDetailResponse = {
  data: {
    id: string;
    attributes: {
      name: string;
      code: string;
      city: string | null;
      district: string | null;
      unitCount: number;
      verifiedCount: number;
      minPrice: number;
      maxPrice: number;
      mapCenter: { lat: number; lng: number; label: string };
    };
    listings: SearchHit[];
  };
};

export async function fetchProjectDetail(projectId: string) {
  const res = await fetch(`${API_BASE}/search/projects/${encodeURIComponent(projectId)}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Project failed: ${res.status}`);
  return res.json() as Promise<ProjectDetailResponse>;
}

export async function fetchSearchMap(projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`${API_BASE}/search/map${qs}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Map failed: ${res.status}`);
  return res.json() as Promise<{
    data: {
      center: { lat: number; lng: number; label: string };
      pins: (MapPin & { thumbnailUrl?: string | null; verified?: boolean; listingId?: string })[];
      buildings?: MapBuilding[];
      mode: string;
    };
  }>;
}

export async function fetchUnitMedia(unitId: string) {
  const res = await fetch(`${API_BASE}/search/units/${encodeURIComponent(unitId)}/media`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Media failed: ${res.status}`);
  return res.json() as Promise<{
    data: { id: string; attributes: { url: string; isCover: boolean; mimeType: string } }[];
  }>;
}

export type RecommendationHit = {
  id: string;
  listingId: string;
  matchScore: number;
  reasons: string[];
  attributes: {
    code: string;
    projectName: string;
    basePrice: number;
    bedrooms: number;
    area: number;
    title: string;
    verified: boolean;
    unitStatus: string;
  };
};

export async function fetchRecommendations(params: {
  seedUnitId?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.seedUnitId) qs.set('seedUnitId', params.seedUnitId);
  if (params.bedrooms !== undefined) qs.set('bedrooms', String(params.bedrooms));
  if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/search/recommendations?${qs.toString()}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Recommendations failed: ${res.status}`);
  return res.json() as Promise<{
    data: RecommendationHit[];
    meta: { count: number; seedUnitId: string | null; uc: string[] };
  }>;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('API offline');
  return res.json();
}

export type ReconciliationStatus = 'MATCHED' | 'MISMATCH';

export type ReconciliationDiscrepancy = {
  type: 'GATEWAY_ONLY' | 'LEDGER_ONLY' | 'AMOUNT_MISMATCH';
  paymentIntentId?: string;
  journalId?: string;
  gatewayAmount?: number;
  ledgerAmount?: number;
  detail?: string;
};

export type ReconciliationRecord = {
  date: string;
  attributes: {
    status: ReconciliationStatus;
    gatewayTotal: number;
    ledgerTotal: number;
    gatewayCount: number;
    ledgerCount: number;
    discrepancies: ReconciliationDiscrepancy[];
    ranAt: string;
  };
};

export type ReconciliationListResponse = {
  data: ReconciliationRecord[];
  meta: {
    tenantId: string;
    matchedDays: number;
    totalDays: number;
    matchRate: number;
    consecutiveMatchedDays?: number;
    opWin02Passed?: boolean;
    source: 'postgres';
  };
};

export type ReconciliationDayResponse = {
  data: ReconciliationRecord;
  meta: {
    tenantId: string;
    source: 'postgres';
  };
};

function authHeaders(session: AuthSession): HeadersInit {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    'X-Tenant-Id': session.tenantId,
  };
}

function requireSession(): AuthSession {
  const session = getSession();
  if (!session) throw new Error('Not authenticated');
  return session;
}

export async function fetchReconciliationRange(
  days = 7,
  refresh = false,
): Promise<ReconciliationListResponse> {
  const session = requireSession();
  const qs = new URLSearchParams({ days: String(days) });
  if (refresh) qs.set('refresh', 'true');
  const res = await fetch(`${API_BASE}/ledger/reconciliation?${qs.toString()}`, {
    headers: authHeaders(session),
  });
  if (!res.ok) throw new Error(`Reconciliation failed: ${res.status}`);
  return res.json();
}

export async function fetchReconciliationDay(
  date: string,
  refresh = false,
): Promise<ReconciliationDayResponse> {
  const session = requireSession();
  const qs = new URLSearchParams({ date });
  if (refresh) qs.set('refresh', 'true');
  const res = await fetch(`${API_BASE}/ledger/reconciliation?${qs.toString()}`, {
    headers: authHeaders(session),
  });
  if (!res.ok) throw new Error(`Reconciliation failed: ${res.status}`);
  return res.json();
}

export type CommissionSplitRule = {
  role: 'PRIMARY' | 'CO_BROKER' | 'AGENCY';
  recipientId: string;
  percent: number;
};

export type PolicyRecord = {
  id: string;
  attributes: {
    projectId: string;
    version: number;
    status: 'DRAFT' | 'PUBLISHED';
    name: string;
    ratePercent: number;
    baseType: 'DEPOSIT' | 'SALE_PRICE';
    splitRules: CommissionSplitRule[];
    publishedAt?: string;
  };
};

export type EntryRecord = {
  id: string;
  attributes: {
    snapshotId?: string;
    role: string;
    recipientType?: string;
    recipientId: string;
    splitPercent: number;
    amount: number;
    payoutStatus: string;
  };
};

export type SnapshotDetail = {
  data: {
    id: string;
    attributes: {
      bookingId: string;
      policyHash: string;
      totalCommission: number;
      status: string;
    };
  };
  entries: EntryRecord[];
  disputes?: DisputeRecord[];
  meta?: { splitTotalPercent?: number; payoutBlocked?: boolean };
};

export type CommissionSnapshotRecord = {
  id: string;
  attributes: {
    bookingId: string;
    policyId: string;
    policyVersion: number;
    policyHash: string;
    dealAmount: number;
    totalCommission: number;
    status: string;
    calculatedAt: string;
  };
};

export type DisputeRecord = {
  id: string;
  attributes: {
    snapshotId: string;
    bookingId?: string;
    reason: string;
    status: 'OPEN' | 'RESOLVED';
    holdbackPercent: number;
    openedAt: string;
    resolvedAt?: string;
  };
};

async function authFetch(path: string, init: RequestInit = {}) {
  const session = requireSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(session),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request failed: ${res.status}`);
  }
  return res;
}

export async function fetchCommissionPolicies(projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await authFetch(`/commission/policies${qs}`);
  return res.json() as Promise<{ data: PolicyRecord[] }>;
}

export async function createCommissionPolicy(input: {
  projectId: string;
  name: string;
  ratePercent: number;
  splitRules: CommissionSplitRule[];
}) {
  const res = await authFetch('/commission/policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: PolicyRecord }>;
}

export async function publishCommissionPolicy(policyId: string) {
  const res = await authFetch(`/commission/policies/${policyId}/publish`, { method: 'POST' });
  return res.json() as Promise<{ data: PolicyRecord }>;
}

export type DistributionPolicyRecord = {
  id: string;
  attributes: {
    tenantId: string;
    projectId: string;
    version: number;
    status: 'DRAFT' | 'PUBLISHED';
    name: string;
    terms: {
      regions?: string[];
      commissionTier?: string;
      maxAgencies?: number;
      summary?: string;
    };
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
};

export type MarketplaceProjectRecord = {
  developerTenantId: string;
  developerName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  distributionPolicyId: string;
  policyName: string;
  terms: DistributionPolicyRecord['attributes']['terms'];
  publishedAt?: string;
  applicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
};

export type AgencyApplicationRecord = {
  id: string;
  attributes: {
    developerTenantId: string;
    agencyTenantId: string;
    projectId: string;
    distributionPolicyId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    message?: string;
    reviewNotes?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    createdAt: string;
    updatedAt: string;
    developerName?: string;
    agencyName?: string;
    projectName?: string;
  };
};

export async function fetchDistributionPolicies(projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await authFetch(`/marketing/distribution/policies${qs}`);
  return res.json() as Promise<{ data: DistributionPolicyRecord[] }>;
}

export async function createDistributionPolicy(input: {
  projectId: string;
  name: string;
  terms?: DistributionPolicyRecord['attributes']['terms'];
}) {
  const res = await authFetch('/marketing/distribution/policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: DistributionPolicyRecord }>;
}

export async function publishDistributionPolicy(policyId: string) {
  const res = await authFetch(`/marketing/distribution/policies/${policyId}/publish`, {
    method: 'POST',
  });
  return res.json() as Promise<{ data: DistributionPolicyRecord }>;
}

export async function fetchMarketplaceProjects() {
  const res = await authFetch('/marketing/marketplace/projects');
  return res.json() as Promise<{ data: MarketplaceProjectRecord[] }>;
}

export async function submitAgencyApplication(input: {
  developerTenantId: string;
  projectId: string;
  distributionPolicyId: string;
  message?: string;
}) {
  const res = await authFetch('/marketing/marketplace/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: AgencyApplicationRecord; meta?: { idempotentReplay?: boolean } }>;
}

export async function fetchAgencyApplications(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await authFetch(`/marketing/applications${qs}`);
  return res.json() as Promise<{ data: AgencyApplicationRecord[] }>;
}

export async function reviewAgencyApplication(
  applicationId: string,
  input: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string },
) {
  const res = await authFetch(`/marketing/applications/${applicationId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: AgencyApplicationRecord }>;
}

export type DocumentRecord = {
  id: string;
  attributes: {
    tenantId: string;
    entityType: 'PROJECT' | 'UNIT' | 'BOOKING' | 'TENANT';
    entityId: string;
    folder: 'LEGAL' | 'MARKETING' | 'CONTRACT' | 'OTHER';
    docType: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    contentHash: string;
    storageProvider: 'LOCAL' | 'S3';
    watermarkEnabled: boolean;
    scanStatus: 'PENDING' | 'CLEAN' | 'QUARANTINE';
    retentionClass: string;
    version: number;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type DocumentAccessLogRecord = {
  id: string;
  attributes: {
    documentId: string;
    action: 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'PRESIGN';
    actorId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  };
};

export async function fetchDocuments(filters: {
  entityType?: string;
  entityId?: string;
  folder?: string;
}) {
  const qs = new URLSearchParams();
  if (filters.entityType) qs.set('entityType', filters.entityType);
  if (filters.entityId) qs.set('entityId', filters.entityId);
  if (filters.folder) qs.set('folder', filters.folder);
  const query = qs.toString();
  const res = await authFetch(`/documents${query ? `?${query}` : ''}`);
  return res.json() as Promise<{ data: DocumentRecord[] }>;
}

export async function uploadDocument(
  file: File,
  input: {
    entityType: DocumentRecord['attributes']['entityType'];
    entityId: string;
    docType: string;
    folder?: DocumentRecord['attributes']['folder'];
    retentionClass?: string;
  },
) {
  const session = requireSession();
  const form = new FormData();
  form.append('file', file);
  form.append('entityType', input.entityType);
  form.append('entityId', input.entityId);
  form.append('docType', input.docType);
  if (input.folder) form.append('folder', input.folder);
  if (input.retentionClass) form.append('retentionClass', input.retentionClass);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: authHeaders(session),
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Upload failed (${res.status})`);
  }
  return res.json() as Promise<{ data: DocumentRecord; meta?: { idempotentReplay?: boolean } }>;
}

export async function fetchDocumentAccessLog(documentId: string) {
  const res = await authFetch(`/documents/${encodeURIComponent(documentId)}/access-log`);
  return res.json() as Promise<{ data: DocumentAccessLogRecord[] }>;
}

export async function downloadDocument(documentId: string, fileName: string) {
  const session = requireSession();
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(documentId)}/download`, {
    headers: authHeaders(session),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Download failed (${res.status})`);
  }
  const watermark = res.headers.get('X-WEREAL-Watermark');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return { watermark };
}

export async function closeCommissionDeal(bookingId: string) {
  const res = await authFetch(`/commission/deals/${bookingId}/close`, { method: 'POST' });
  return res.json() as Promise<SnapshotDetail & { entries: EntryRecord[] }>;
}

export async function openCommissionHoldback(
  snapshotId: string,
  input: { reason: string; holdbackPercent?: number },
) {
  const res = await authFetch(`/commission/snapshots/${snapshotId}/holdback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: DisputeRecord }>;
}

export async function resolveCommissionHoldback(snapshotId: string, disputeId: string) {
  const res = await authFetch(
    `/commission/snapshots/${encodeURIComponent(snapshotId)}/holdback/${encodeURIComponent(disputeId)}/resolve`,
    { method: 'POST' },
  );
  return res.json() as Promise<{ data: DisputeRecord; meta?: { idempotentReplay?: boolean } }>;
}

export async function fetchCommissionSnapshots(bookingId?: string) {
  const qs = bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : '';
  const res = await authFetch(`/commission/snapshots${qs}`);
  return res.json() as Promise<{ data: CommissionSnapshotRecord[]; meta: { count: number } }>;
}

export async function fetchCommissionDisputes(status?: 'OPEN' | 'RESOLVED') {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await authFetch(`/commission/disputes${qs}`);
  return res.json() as Promise<{ data: DisputeRecord[]; meta: { count: number; status: string | null } }>;
}

export async function fetchCommissionSnapshot(snapshotId: string) {
  const res = await authFetch(`/commission/snapshots/${snapshotId}`);
  return res.json() as Promise<SnapshotDetail>;
}

export async function downloadCommissionExport(dateFrom?: string, dateTo?: string) {
  const session = requireSession();
  const qs = new URLSearchParams();
  if (dateFrom) qs.set('dateFrom', dateFrom);
  if (dateTo) qs.set('dateTo', dateTo);
  const query = qs.toString();
  const res = await fetch(`${API_BASE}/commission/export.csv${query ? `?${query}` : ''}`, {
    headers: authHeaders(session),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

export type CommissionExportJob = {
  id: string;
  dateFrom?: string;
  dateTo?: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  rowCount: number;
  csvSha256: string;
  createdAt: string;
  readyAt?: string;
  downloadExpiresAt?: string;
};

export async function createCommissionExportJob(input: { dateFrom?: string; dateTo?: string }) {
  const res = await authFetch('/commission/export/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Export job failed: ${res.status}`);
  return res.json() as Promise<{ data: CommissionExportJob; meta: { status: string } }>;
}

export async function fetchCommissionExportJob(jobId: string) {
  const res = await authFetch(`/commission/export/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`Export job status failed: ${res.status}`);
  return res.json() as Promise<{ data: CommissionExportJob }>;
}

export async function downloadCommissionExportJob(jobId: string) {
  const session = requireSession();
  const res = await fetch(`${API_BASE}/commission/export/jobs/${encodeURIComponent(jobId)}/download`, {
    headers: authHeaders(session),
  });
  if (!res.ok) throw new Error(`Export job download failed: ${res.status}`);
  return res.blob();
}

export type SettlementLineRecord = EntryRecord & {
  attributes: EntryRecord['attributes'] & {
    bookingId?: string;
    settlementRunId?: string;
    kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    payoutEligible?: boolean;
    createdAt?: string;
  };
};

export type SettlementRunRecord = {
  id: string;
  attributes: {
    status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
    label?: string;
    periodFrom?: string;
    periodTo?: string;
    entryCount: number;
    totalAmount: number;
    createdBy?: string;
    completedAt?: string;
    createdAt: string;
    payout?: {
      status: 'SUBMITTED' | 'SKIPPED' | 'FAILED';
      batchId?: string;
      provider?: string;
    };
  };
};

export async function fetchCommissionLines(payoutStatus?: string) {
  const qs = payoutStatus ? `?payoutStatus=${encodeURIComponent(payoutStatus)}` : '';
  const res = await authFetch(`/commission/lines${qs}`);
  return res.json() as Promise<{
    data: SettlementLineRecord[];
    meta: {
      count: number;
      payableCount: number;
      approvedCount: number;
      kycBlockedCount: number;
      settlementReadyCount: number;
    };
  }>;
}

export async function approveKycProfile(
  subjectType: 'USER' | 'AGENCY' | 'TENANT',
  subjectId: string,
  notes?: string,
) {
  const res = await authFetch(
    `/kyc/profiles/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectId)}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  return res.json() as Promise<{ data: KycProfileRecord }>;
}

export type TenantRecord = {
  id: string;
  attributes: {
    name: string;
    type: string;
    isActive: boolean;
    createdAt: string;
  };
};

export type UserRecord = {
  id: string;
  attributes: {
    email: string;
    role: string;
    status: 'ACTIVE' | 'DEACTIVATED';
    tenantId: string;
    createdAt: string;
  };
};

export type KycProfileRecord = {
  id: string;
  attributes: {
    subjectType: 'USER' | 'AGENCY' | 'TENANT';
    subjectId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    verifiedAt?: string;
    notes?: string;
    updatedAt: string;
  };
};

export async function fetchUsers() {
  const res = await authFetch('/users');
  return res.json() as Promise<{ data: UserRecord[]; meta: { count: number; tenantId: string } }>;
}

export type RoleDefinition = {
  id: string;
  label: string;
  description: string;
  permissions: string[];
};

export type TenantRolePolicy = {
  projectScopes: { role: string; projectIds: string[] }[];
  updatedAt: string;
};

export async function fetchRoleCatalog() {
  const res = await authFetch('/roles');
  return res.json() as Promise<{ data: RoleDefinition[]; meta: { count: number } }>;
}

export async function fetchRolePolicy() {
  const res = await authFetch('/roles/policy');
  return res.json() as Promise<{ data: TenantRolePolicy; meta: { tenantId: string } }>;
}

export async function patchRolePolicy(projectScopes: TenantRolePolicy['projectScopes']) {
  const res = await authFetch('/roles/policy', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectScopes }),
  });
  return res.json() as Promise<{ data: TenantRolePolicy; meta: { tenantId: string } }>;
}

export async function patchUserRole(userId: string, role: string) {
  const res = await authFetch(`/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  return res.json() as Promise<{ data: UserRecord }>;
}

export type BookingReplayData = {
  booking: BookingDetail['data'];
  timeline: BookingTimelineEntry[];
  domainEvents: BookingDomainEvent[];
  reconstructedStates: {
    at: string;
    eventType: string;
    category: string;
    inferredStatus: string;
  }[];
  evidence: { auditQuery: string; exportHint: string };
};

export async function fetchBookingReplay(bookingId: string) {
  const res = await authFetch(`/bookings/${encodeURIComponent(bookingId)}/replay`);
  if (!res.ok) throw new Error(`Booking replay failed: ${res.status}`);
  return res.json() as Promise<{ data: BookingReplayData; meta: { bookingId: string } }>;
}

export type TrustDisputeRecord = {
  id: string;
  attributes: {
    bookingId: string | null;
    type: string;
    status: 'OPEN' | 'IN_MEDIATION' | 'RESOLVED';
    reason: string;
    evidence: Record<string, unknown>[];
    resolutionNote: string | null;
    openedBy: string | null;
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
  };
};

export async function fetchTrustDisputes(status?: TrustDisputeRecord['attributes']['status']) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await authFetch(`/disputes${qs}`);
  return res.json() as Promise<{ data: TrustDisputeRecord[]; meta: { count: number } }>;
}

export async function openTrustDispute(input: {
  bookingId?: string;
  type?: string;
  reason: string;
  evidence?: Record<string, unknown>[];
}) {
  const res = await authFetch('/disputes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: TrustDisputeRecord }>;
}

export async function mediateTrustDispute(disputeId: string) {
  const res = await authFetch(`/disputes/${encodeURIComponent(disputeId)}/mediate`, {
    method: 'PATCH',
  });
  return res.json() as Promise<{ data: TrustDisputeRecord }>;
}

export async function resolveTrustDispute(disputeId: string, resolutionNote: string) {
  const res = await authFetch(`/disputes/${encodeURIComponent(disputeId)}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolutionNote }),
  });
  return res.json() as Promise<{ data: TrustDisputeRecord }>;
}

export type DuplicateListingGroup = {
  groupKey: string;
  reason: 'SAME_UNIT' | 'SIMILAR_TITLE';
  unitId: string;
  listings: {
    id: string;
    title: string;
    status: string;
    unitId: string;
    verified: boolean;
    createdAt: string;
  }[];
};

export async function fetchListingDuplicates() {
  const res = await authFetch('/listings/duplicates');
  return res.json() as Promise<{ data: DuplicateListingGroup[]; meta: { count: number } }>;
}

export async function resolveListingDuplicate(groupKey: string) {
  const res = await authFetch(`/listings/duplicates/${encodeURIComponent(groupKey)}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'KEEP_PRIMARY_REJECT_OTHERS' }),
  });
  return res.json() as Promise<{
    data: { groupKey: string; primaryId: string; rejectedIds: string[] };
  }>;
}

export async function createTenant(input: {
  name: string;
  type: 'DEVELOPER' | 'AGENCY' | 'PLATFORM';
  slug?: string;
}) {
  const res = await authFetch('/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: TenantRecord }>;
}

export async function fetchKycProfiles(subjectType?: 'USER' | 'AGENCY' | 'TENANT') {
  const qs = subjectType ? `?subjectType=${encodeURIComponent(subjectType)}` : '';
  const res = await authFetch(`/kyc/profiles${qs}`);
  return res.json() as Promise<{ data: KycProfileRecord[]; meta: { count: number } }>;
}

export async function rejectKycProfile(
  subjectType: 'USER' | 'AGENCY' | 'TENANT',
  subjectId: string,
  notes?: string,
) {
  const res = await authFetch(
    `/kyc/profiles/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectId)}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  return res.json() as Promise<{ data: KycProfileRecord }>;
}

export type KycWorkflowStep = {
  id: string;
  label: string;
  done: boolean;
  required: boolean;
};

export type KycWorkflowEvent = {
  id: string;
  action: string;
  label: string;
  actorId?: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type KycWorkflowData = {
  profile: KycProfileRecord;
  checklist: KycWorkflowStep[];
  events: KycWorkflowEvent[];
  payoutGate: boolean;
};

export async function fetchKycWorkflow(
  subjectType: 'USER' | 'AGENCY' | 'TENANT',
  subjectId: string,
) {
  const res = await authFetch(
    `/kyc/profiles/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectId)}/workflow`,
  );
  return res.json() as Promise<{ data: KycWorkflowData; meta: { uc: string[]; screen: string } }>;
}

export async function requestKycResubmit(
  subjectType: 'USER' | 'AGENCY' | 'TENANT',
  subjectId: string,
  reason: string,
) {
  const res = await authFetch(
    `/kyc/profiles/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectId)}/resubmit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  return res.json() as Promise<{ data: KycWorkflowData }>;
}

export type LegalCorpusItem = {
  id: string;
  documentId?: string;
  title: string;
  source: string;
  tags: string[];
};

export type LegalRagHit = {
  id: string;
  documentId?: string;
  title: string;
  source: string;
  score: number;
  snippet: string;
};

export async function fetchLegalCorpus() {
  const res = await authFetch('/ai/legal/corpus');
  return res.json() as Promise<{ data: LegalCorpusItem[]; meta: { count: number } }>;
}

export async function queryLegalRag(query: string, limit = 5) {
  const res = await authFetch('/ai/legal/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  return res.json() as Promise<{
    data: { query: string; answer: string; hits: LegalRagHit[]; model: string };
    meta: { hitCount: number };
  }>;
}

export type DeveloperLeaderboardEntry = {
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

export async function fetchDeveloperLeaderboard() {
  const res = await authFetch('/marketing/leaderboard');
  return res.json() as Promise<{
    data: DeveloperLeaderboardEntry[];
    meta: { count: number; period: string };
  }>;
}

export type SettlementScheduleConfig = {
  enabled: boolean;
  cronLabel: string;
  timezone: string;
  minReadyLines: number;
  readyCount: number;
  lastRunAt?: string;
  lastRunStatus?: 'SKIPPED' | 'COMPLETED' | 'FAILED';
  lastRunId?: string;
  lastError?: string;
};

export async function fetchSettlementSchedule() {
  const res = await authFetch('/commission/settlement/schedule');
  return res.json() as Promise<{ data: SettlementScheduleConfig }>;
}

export async function updateSettlementSchedule(patch: {
  enabled?: boolean;
  minReadyLines?: number;
  cronLabel?: string;
}) {
  const res = await authFetch('/commission/settlement/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.json() as Promise<{ data: SettlementScheduleConfig }>;
}

export async function runSettlementSchedule() {
  const res = await authFetch('/commission/settlement/schedule/run', { method: 'POST' });
  return res.json() as Promise<{
    data: {
      skipped: boolean;
      reason?: string;
      readyCount?: number;
      run?: SettlementRunRecord;
      entryCount?: number;
    };
  }>;
}

export type TenantWebhookEvent =
  | 'booking.created'
  | 'booking.deposited'
  | 'payment.success'
  | 'contract.signed';

export type TenantWebhookSubscription = {
  id: string;
  label: string;
  targetUrl: string;
  events: TenantWebhookEvent[];
  enabled: boolean;
  secretPrefix: string;
  createdAt: string;
};

export type TenantWebhookDelivery = {
  id: string;
  subscriptionId: string;
  event: TenantWebhookEvent;
  status: 'DELIVERED' | 'FAILED' | 'SKIPPED';
  attempt: number;
  mode?: 'live' | 'simulate';
  responseCode?: number;
  deliveredAt: string;
  nextRetryAt?: string;
  error?: string;
};

export async function fetchTenantWebhooks() {
  const res = await authFetch('/integrations/webhooks');
  return res.json() as Promise<{
    data: {
      subscriptions: TenantWebhookSubscription[];
      recentDeliveries: TenantWebhookDelivery[];
      availableEvents: TenantWebhookEvent[];
    };
  }>;
}

export async function createTenantWebhook(input: {
  label: string;
  targetUrl: string;
  events?: TenantWebhookEvent[];
}) {
  const res = await authFetch('/integrations/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: { subscription: TenantWebhookSubscription; secret: string } }>;
}

export async function simulateTenantWebhook(
  subscriptionId: string,
  event?: TenantWebhookEvent,
) {
  const res = await authFetch(
    `/integrations/webhooks/${encodeURIComponent(subscriptionId)}/simulate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    },
  );
  return res.json() as Promise<{ data: TenantWebhookDelivery }>;
}

export async function toggleTenantWebhook(subscriptionId: string, enabled: boolean) {
  const res = await authFetch(`/integrations/webhooks/${encodeURIComponent(subscriptionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  return res.json();
}

export type AiReplyDraft = {
  draftId: string;
  inboundMessage: string;
  replyText: string;
  tone: 'formal' | 'friendly' | 'concise';
  confidence: number;
  suggestedActions: string[];
  source?: 'llm' | 'template';
};

export async function draftAiReply(input: {
  leadId?: string;
  inboundMessage: string;
  tone?: AiReplyDraft['tone'];
}) {
  const res = await authFetch('/ai/reply/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: AiReplyDraft; meta?: { source?: string } }>;
}

export async function sendAiReply(input: {
  draftId: string;
  replyText: string;
  channel?: string;
  leadId?: string;
}) {
  const res = await authFetch('/ai/reply/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export type InboxThread = {
  id: string;
  leadId: string;
  leadName: string;
  channel: 'ZALO' | 'META' | 'SMS' | 'WEB' | 'CALL';
  preview: string;
  unread: boolean;
  lastMessageAt: string;
  status: string;
};

export type InboxReplyResult = {
  threadId: string;
  leadId: string;
  status: string;
  channel: InboxThread['channel'];
  deliveryId: string;
  provider: string;
  sentAt: string;
};

export async function fetchInboxThreads() {
  const res = await authFetch('/crm/inbox');
  return res.json() as Promise<{ data: InboxThread[]; meta: { count: number } }>;
}

export async function replyInboxThread(
  threadId: string,
  input: { message: string; channel?: InboxThread['channel'] },
) {
  const res = await authFetch(`/crm/inbox/${encodeURIComponent(threadId)}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Inbox reply failed (${res.status})`);
  }
  return res.json() as Promise<{ data: InboxReplyResult; meta: { uc: string[]; screen: string } }>;
}

export type ChatMessage = { role: 'user' | 'assistant'; text: string; at: string };

export async function startPublicChatSession() {
  const res = await fetch(`${API_BASE}/ai/chat/sessions`, {
    method: 'POST',
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Chat session failed: ${res.status}`);
  return res.json() as Promise<{ data: { sessionId: string; messages: ChatMessage[] } }>;
}

export async function sendPublicChatMessage(input: {
  sessionId: string;
  text: string;
  captureLead?: { fullName?: string; phone?: string };
}) {
  const res = await fetch(`${API_BASE}/ai/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEFAULT_TENANT_ID },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Chat message failed: ${res.status}`);
  return res.json() as Promise<{
    data: {
      sessionId: string;
      messages: ChatMessage[];
      recommendations: { unitId: string; code: string; title: string; basePrice: number; reason: string }[];
      leadId?: string;
    };
  }>;
}

export type SsoProvider = {
  id: string;
  type: 'OIDC' | 'SAML';
  label: string;
  issuerUrl: string;
  clientId: string;
  enabled: boolean;
  roleMapping: Record<string, string>;
};

export async function fetchSsoProviders() {
  const res = await authFetch('/auth/sso/providers');
  return res.json() as Promise<{ data: SsoProvider[] }>;
}

export async function upsertSsoProvider(input: {
  type: 'OIDC' | 'SAML';
  label: string;
  issuerUrl: string;
  clientId: string;
  enabled?: boolean;
}) {
  const res = await authFetch('/auth/sso/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: SsoProvider[] }>;
}

export async function beginSsoAuthorize(input: {
  providerId: string;
  emailHint?: string;
  redirectUri?: string;
}) {
  const qs = new URLSearchParams({ providerId: input.providerId });
  if (input.emailHint) qs.set('emailHint', input.emailHint);
  qs.set(
    'redirectUri',
    input.redirectUri ?? `${window.location.origin}/auth/sso/callback`,
  );
  const res = await fetch(`${API_BASE}/auth/sso/authorize?${qs}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`SSO authorize failed: ${res.status}`);
  return res.json() as Promise<{
    data: { authorizationUrl: string; state: string; mode: string };
  }>;
}

export async function loginSsoPilot(input: {
  providerId: string;
  email: string;
  externalGroups?: string[];
}) {
  const res = await fetch(`${API_BASE}/auth/sso/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEFAULT_TENANT_ID },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`SSO login failed: ${res.status}`);
  return res.json();
}

export type TenantBrandConfig = {
  tenantId: string;
  displayName: string;
  subdomain: string;
  customDomain?: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  live: boolean;
  whiteLabelTier?: 'STANDARD' | 'ENTERPRISE';
  updatedAt: string;
};

export async function fetchTenantBrand() {
  const res = await authFetch('/tenants/branding');
  return res.json() as Promise<{ data: TenantBrandConfig }>;
}

/** P4 — public marketplace brand (no auth) */
export async function fetchPublicBrand(tenantId: string = DEFAULT_TENANT_ID) {
  const res = await fetch(`${API_BASE}/tenants/branding/public`, {
    headers: { 'X-Tenant-Id': tenantId },
  });
  if (!res.ok) throw new Error(`Public brand failed: ${res.status}`);
  return res.json() as Promise<{ data: TenantBrandConfig }>;
}

export async function updateTenantBrand(patch: Partial<TenantBrandConfig>) {
  const res = await authFetch('/tenants/branding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.json() as Promise<{ data: TenantBrandConfig }>;
}

export type BookingWorkflowDefinition = {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  states: { id: string; label: string; terminal?: boolean }[];
  transitions: { from: string; to: string; label: string }[];
  publishedAt?: string;
};

export async function fetchBookingWorkflow() {
  const res = await authFetch('/bookings/workflows');
  return res.json() as Promise<{ data: BookingWorkflowDefinition }>;
}

export async function saveBookingWorkflow(input: Partial<BookingWorkflowDefinition>) {
  const res = await authFetch('/bookings/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: BookingWorkflowDefinition }>;
}

export async function publishBookingWorkflow() {
  const res = await authFetch('/bookings/workflows/publish', { method: 'POST' });
  return res.json() as Promise<{ data: BookingWorkflowDefinition }>;
}

export type EscrowAccount = {
  id: string;
  bookingId: string;
  totalAmount: number;
  heldAmount: number;
  releasedAmount: number;
  status: 'ACTIVE' | 'COMPLETED';
  milestones: {
    id: string;
    label: string;
    amount: number;
    condition: string;
    status: 'PENDING' | 'MET' | 'RELEASED';
    releasedAt?: string;
  }[];
  createdAt: string;
};

export async function fetchEscrowAccounts() {
  const res = await authFetch('/escrow/accounts');
  return res.json() as Promise<{ data: EscrowAccount[] }>;
}

export async function createEscrowAccount(input: { bookingId: string; totalAmount?: number }) {
  const res = await authFetch('/escrow/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: EscrowAccount }>;
}

export async function releaseEscrowMilestone(accountId: string, milestoneId: string) {
  const res = await authFetch(
    `/escrow/accounts/${encodeURIComponent(accountId)}/milestones/${encodeURIComponent(milestoneId)}/release`,
    { method: 'POST' },
  );
  return res.json() as Promise<{ data: EscrowAccount }>;
}

export type BnplApplication = {
  id: string;
  bookingId: string;
  planLabel: string;
  totalAmount: number;
  installmentCount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  externalId?: string;
  partnerReason?: string;
  installments: { id: string; dueDate: string; amount: number; status: string }[];
  createdAt?: string;
};

export async function fetchBnplPlans() {
  const res = await fetch(`${API_BASE}/bnpl/plans`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`BNPL plans failed: ${res.status}`);
  return res.json() as Promise<{ data: { id: string; label: string; installments: number }[] }>;
}

export async function fetchBnplApplications() {
  const res = await authFetch('/bnpl/applications');
  return res.json() as Promise<{ data: BnplApplication[] }>;
}

export async function applyBnpl(input: { bookingId: string; planId: string }) {
  const res = await authFetch('/bnpl/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `BNPL apply failed (${res.status})`);
  }
  return res.json() as Promise<{ data: BnplApplication; meta?: { mode?: string } }>;
}

export async function simulateBnplPartnerWebhook(input: {
  externalId: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}) {
  const res = await fetch(`${API_BASE}/bnpl/webhook/partner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': DEFAULT_TENANT_ID,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `BNPL webhook failed (${res.status})`);
  }
  return res.json() as Promise<{ data: BnplApplication }>;
}

export type MapPin = {
  unitId: string;
  listingId?: string;
  code: string;
  label: string;
  lat: number;
  lng: number;
  basePrice: number;
  status: string;
  bedrooms: number;
  area: number;
  tower: string;
  floor: number;
  heightM?: number;
  thumbnailUrl?: string | null;
  verified?: boolean;
  projectId?: string | null;
};

export type MapBuilding = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  floors: number;
  units: number;
  maxHeightM: number;
};

export async function fetchPublicMap(projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`${API_BASE}/portal/public/map${qs}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Map failed: ${res.status}`);
  return res.json() as Promise<{
    data: {
      center: { lat: number; lng: number; label: string };
      pins: MapPin[];
      buildings?: MapBuilding[];
      mode: string;
    };
  }>;
}

export type MetaIntegrationStatus = {
  channel: 'META';
  pages: { id: string; pageId: string; pageName: string; isActive: boolean }[];
  stats: { processed: number; failed: number };
  recentEvents: {
    id: string;
    leadgenId: string;
    pageId: string;
    status: string;
    leadId?: string | null;
    createdAt: string;
    lastError?: string | null;
  }[];
};

export async function fetchMetaIntegrationStatus() {
  const res = await authFetch('/integrations/meta/status');
  return res.json() as Promise<{ data: MetaIntegrationStatus; meta?: { zaloStatus?: string } }>;
}

export async function simulateMetaLead(input: {
  fullName?: string;
  phone?: string;
  campaignId?: string;
  adId?: string;
  pageId?: string;
}) {
  const res = await authFetch('/integrations/meta/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    leadgenId: string;
    leadId: string;
    processed: boolean;
    idempotentReplay?: boolean;
    status: string;
  }>;
}

export async function connectMetaPage(input: {
  pageId: string;
  pageName?: string;
  pageAccessToken: string;
}) {
  const res = await authFetch('/integrations/meta/pages/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Meta page connect failed (${res.status})`);
  }
  return res.json() as Promise<{
    data: { id: string; pageId: string; pageName: string; hasToken: boolean };
  }>;
}

export async function startMetaOAuthRedirect() {
  const res = await authFetch('/integrations/meta/oauth/start');
  return res.json() as Promise<{
    authorizationUrl: string;
    state: string;
    redirectUri: string;
    expiresIn: number;
  }>;
}

export type ZaloIntegrationStatus = {
  channel: 'ZALO';
  graphMode: 'SANDBOX' | 'LIVE' | 'UNCONFIGURED';
  oas: {
    id: string;
    oaId: string;
    oaName: string;
    isActive: boolean;
    hasToken?: boolean;
    tokenExpiresAt?: string | null;
  }[];
  templates: string[];
  stats: { leadsProcessed: number; leadsFailed: number; znsSent: number };
  recentEvents: {
    id: string;
    msgId: string;
    oaId: string;
    status: string;
    leadId?: string | null;
    createdAt: string;
    lastError?: string | null;
  }[];
  recentZns: {
    id: string;
    templateId: string;
    phone: string;
    status: string;
    providerRef?: string | null;
    createdAt: string;
  }[];
};

export async function fetchZaloIntegrationStatus() {
  const res = await authFetch('/integrations/zalo/status');
  return res.json() as Promise<{ data: ZaloIntegrationStatus; meta?: { tenantId?: string } }>;
}

export type SmsIntegrationStatus = {
  channel: 'SMS';
  graphMode: 'SANDBOX' | 'LIVE' | 'UNCONFIGURED';
  bindings: {
    id: string;
    provider: string;
    brandName: string;
    senderId?: string | null;
    isActive: boolean;
    hasApiKey?: boolean;
  }[];
  templates: string[];
  stats: { sent: number; delivered: number; failed: number };
  recentDeliveries: {
    id: string;
    templateId: string;
    phone: string;
    status: string;
    providerRef?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    createdAt: string;
    lastError?: string | null;
  }[];
};

export async function fetchSmsIntegrationStatus() {
  const res = await authFetch('/integrations/sms/status');
  return res.json() as Promise<{ data: SmsIntegrationStatus; meta?: { tenantId?: string } }>;
}

export async function simulateSmsDelivery(input: {
  phone?: string;
  templateId?: string;
  message?: string;
}) {
  const res = await authFetch('/integrations/sms/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    deliveryId: string;
    status: string;
    providerRef?: string | null;
    sandbox: boolean;
    graphMode?: 'SANDBOX' | 'LIVE' | 'UNCONFIGURED';
    idempotentReplay?: boolean;
    otp?: string;
  }>;
}

export async function sendSmsMessage(input: {
  templateId?: string;
  phone?: string;
  params?: Record<string, unknown>;
}) {
  const res = await authFetch('/integrations/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    deliveryId: string;
    status: string;
    providerRef?: string | null;
    sandbox: boolean;
    graphMode?: 'SANDBOX' | 'LIVE' | 'UNCONFIGURED';
    idempotentReplay?: boolean;
    otp?: string;
  }>;
}

export type AdminDashboardData = {
  attributes: {
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
  };
};

export type DeveloperDashboardData = {
  attributes: {
    inventory: {
      total: number;
      available: number;
      reserved: number;
      sold: number;
      hold: number;
      absorptionRate: number;
    };
    listings: { published: number };
    commission: { policies: number };
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
};

export async function fetchAdminDashboard() {
  const res = await authFetch('/portal/admin/dashboard');
  if (!res.ok) throw new Error(`Admin dashboard failed: ${res.status}`);
  return res.json() as Promise<{ data: AdminDashboardData; meta: { tenantId: string } }>;
}

export type OpsWidget = {
  id: 'stuckPayments' | 'lockTtl' | 'driftBlock' | 'reconcileMismatch';
  title: string;
  count: number;
  severity: 'ok' | 'warn' | 'alert';
  hint: string;
  deepLink: string;
  runbook: string;
  runbookAnchor: string;
  items: { id: string; label: string; detail?: string }[];
  metrics?: Record<string, number>;
};

export async function fetchOpsConsole() {
  const res = await authFetch('/ops/console');
  if (!res.ok) throw new Error(`Ops console failed: ${res.status}`);
  return res.json() as Promise<{
    data: { widgets: OpsWidget[]; healthy: boolean };
    meta: { tenantId: string; uc: string[] };
  }>;
}

export type OpsReadinessSnapshot = {
  grafana: {
    stagingUrl: string;
    alertsEnabled: boolean;
    dashboardPath: string;
    alertsPath: string;
    importRunbook: string;
  };
  onCall: {
    roster: string;
    rosterDoc: string;
    escalation: string;
    slackChannel: string;
  };
  incidentDrill: {
    complete: boolean;
    evidencePath: string | null;
    script: string;
    runbook: string;
  };
  contractGate: {
    openapiPath: string;
    validateScript: string;
    routeCoverageScript: string;
  };
  sprint: string;
  gate: string;
};

export async function fetchOpsReadiness() {
  const res = await authFetch('/ops/readiness');
  if (!res.ok) throw new Error(`Ops readiness failed: ${res.status}`);
  return res.json() as Promise<{ data: OpsReadinessSnapshot; meta: { uc: string[] } }>;
}

export type GmvReportData = {
  attributes: {
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
};

export type AbsorptionReportData = {
  attributes: {
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
    inventoryValue: { availableBasePrice: number; soldBasePrice: number };
    previewUnits: {
      id: string;
      code: string;
      status: string;
      basePrice: number;
      area: number;
    }[];
  };
};

export type ForecastReportData = {
  attributes: {
    projectId: string | null;
    horizonMonths: number;
    current: AbsorptionReportData['attributes']['inventory'];
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
};

export async function fetchGmvReport(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const query = qs.toString();
  const res = await authFetch(`/analytics/gmv${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(`GMV report failed: ${res.status}`);
  return res.json() as Promise<{ data: GmvReportData; meta: { tenantId: string } }>;
}

export type AttributionReportData = {
  attributes: {
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
};

export async function fetchAttributionReport(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const query = qs.toString();
  const res = await authFetch(`/analytics/attribution${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(`Attribution report failed: ${res.status}`);
  return res.json() as Promise<{ data: AttributionReportData; meta: { tenantId: string } }>;
}

export async function fetchAbsorptionReport(projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await authFetch(`/analytics/absorption${qs}`);
  if (!res.ok) throw new Error(`Absorption report failed: ${res.status}`);
  return res.json() as Promise<{
    data: AbsorptionReportData;
    meta: { tenantId: string; projectId: string | null };
  }>;
}

export async function fetchAbsorptionForecast(projectId?: string, months = 6) {
  const qs = new URLSearchParams();
  if (projectId) qs.set('projectId', projectId);
  qs.set('months', String(months));
  const res = await authFetch(`/analytics/forecast?${qs.toString()}`);
  if (!res.ok) throw new Error(`Forecast report failed: ${res.status}`);
  return res.json() as Promise<{
    data: ForecastReportData;
    meta: { tenantId: string; projectId: string | null; model: string };
  }>;
}

export async function fetchIntelligenceHeatmap(projectId?: string) {
  const qs = new URLSearchParams();
  if (projectId) qs.set('projectId', projectId);
  const res = await authFetch(`/analytics/intelligence/heatmap?${qs.toString()}`);
  if (!res.ok) throw new Error(`Heatmap failed: ${res.status}`);
  return res.json();
}

export async function fetchIntelligencePricingReport(projectId: string) {
  const res = await authFetch(`/analytics/intelligence/pricing-report/${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`Pricing report failed: ${res.status}`);
  return res.json();
}

export async function fetchIntelligenceMarketBrief() {
  const res = await authFetch('/analytics/intelligence/market-brief');
  if (!res.ok) throw new Error(`Market brief failed: ${res.status}`);
  return res.json();
}

export async function fetchIntelligenceBilling() {
  const res = await authFetch('/analytics/intelligence/billing');
  if (!res.ok) throw new Error(`Billing failed: ${res.status}`);
  return res.json() as Promise<{
    data: {
      tenantId: string;
      currency: string;
      estimatedMrrVnd: number;
      billingTier: string;
      lineItems: Array<{ productCode: string; enabled: boolean; unitPriceVnd: number }>;
    };
  }>;
}

export type AnchorDashboardData = {
  profile: {
    tenantId: string;
    displayName: string;
    pilotClass: 'LIVE' | 'SYNTHETIC';
    trustScoreMin: number;
  };
  trustScores: Array<{ projectId: string; score: number }>;
  gmv: { depositedBookings: number; totalBookings: number };
  onboardingChecklist: {
    ready: boolean;
    steps: Record<string, boolean>;
  } | null;
  opWinChecklist: { grTrustScore: boolean; gmvLive: boolean };
};

export async function fetchAnchorDashboard() {
  const res = await authFetch('/anchor/dashboard');
  if (!res.ok) throw new Error(`Anchor dashboard failed: ${res.status}`);
  return res.json() as Promise<{ data: AnchorDashboardData; meta: Record<string, unknown> }>;
}

export type OmnichannelDashboardData = {
  attributes: {
    summary: {
      totalSynced: number;
      totalFailed: number;
      totalDuplicate: number;
      successRate: number;
      crmLeadsFromChannels: number;
      last24h: number;
      last7d: number;
      latency: {
        sampleCount: number;
        p50Ms: number | null;
        p95Ms: number | null;
        p99Ms: number | null;
        maxMs: number | null;
        slaTargetMs: number;
        slaPass: boolean;
      };
      opWin07Pass: boolean;
    };
    meta: {
      processed: number;
      failed: number;
      duplicate: number;
      processing: number;
      last24h: number;
      last7d: number;
      successRate: number;
      latency?: {
        sampleCount: number;
        p50Ms: number | null;
        p95Ms: number | null;
        p99Ms: number | null;
        maxMs: number | null;
        slaTargetMs: number;
        slaPass: boolean;
      };
      pagesConnected: number;
      pages: { id: string; pageId: string; pageName: string }[];
    };
    zalo: {
      processed: number;
      failed: number;
      duplicate: number;
      processing: number;
      last24h: number;
      last7d: number;
      successRate: number;
      latency?: {
        sampleCount: number;
        p50Ms: number | null;
        p95Ms: number | null;
        p99Ms: number | null;
        maxMs: number | null;
        slaTargetMs: number;
        slaPass: boolean;
      };
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
    recentSync: {
      id: string;
      channel: 'META' | 'ZALO';
      externalId: string;
      status: string;
      leadId?: string | null;
      createdAt: string;
      lastError?: string | null;
      ingestMs?: number | null;
      slaMs?: number | null;
    }[];
    recentZns: {
      id: string;
      templateId: string;
      phone: string;
      status: string;
      createdAt: string;
    }[];
  };
};

export async function fetchOmnichannelDashboard() {
  const res = await authFetch('/portal/admin/omnichannel');
  if (!res.ok) throw new Error(`Omnichannel dashboard failed: ${res.status}`);
  return res.json() as Promise<{
    data: OmnichannelDashboardData;
    meta: { tenantId: string; screen: string };
  }>;
}

export async function fetchDeveloperDashboard(projectId?: string) {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await authFetch(`/portal/developer/dashboard${qs}`);
  if (!res.ok) throw new Error(`Developer dashboard failed: ${res.status}`);
  return res.json() as Promise<{
    data: DeveloperDashboardData;
    meta: { tenantId: string; projectId: string | null };
  }>;
}

export async function simulateZaloLead(input: {
  fullName?: string;
  phone?: string;
  oaId?: string;
  message?: string;
}) {
  const res = await authFetch('/integrations/zalo/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    msgId: string;
    leadId: string;
    processed: boolean;
    idempotentReplay?: boolean;
    status: string;
  }>;
}

export async function sendZaloZns(input: { phone?: string; templateId?: string }) {
  const res = await authFetch('/integrations/zalo/zns/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    deliveryId: string;
    status: string;
    providerRef?: string | null;
    sandbox: boolean;
    graphMode?: 'SANDBOX' | 'LIVE';
  }>;
}

export async function startZaloOAuthRedirect(oaId?: string) {
  const qs = oaId ? `?oaId=${encodeURIComponent(oaId)}` : '';
  const res = await authFetch(`/integrations/zalo/oauth/start${qs}`);
  return res.json() as Promise<{
    authorizationUrl: string;
    state: string;
    redirectUri: string;
    expiresIn: number;
  }>;
}

export async function connectZaloOAuth(input: {
  refreshToken: string;
  accessToken?: string;
  oaId?: string;
  expiresIn?: number;
}) {
  const res = await authFetch('/integrations/zalo/oauth/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    oaId: string;
    connected: boolean;
    tokenExpiresAt?: string | null;
    graphMode: string;
  }>;
}

export async function verifyZaloOAuth(oaId?: string) {
  const res = await authFetch('/integrations/zalo/oauth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oaId }),
  });
  return res.json() as Promise<
    | { ok: true; oaId?: string; oaName?: string; verified?: boolean }
    | { ok: false; error: string }
  >;
}

export async function approveCommissionLines(entryIds: string[]) {
  const res = await authFetch('/commission/lines/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryIds }),
  });
  return res.json() as Promise<{ data: SettlementLineRecord[]; meta: { approvedCount: number } }>;
}

export async function fetchSettlementRuns() {
  const res = await authFetch('/commission/settlement/runs');
  return res.json() as Promise<{ data: SettlementRunRecord[]; meta: { count: number } }>;
}

export async function createSettlementRun(input: {
  label?: string;
  periodFrom?: string;
  periodTo?: string;
  entryIds?: string[];
}) {
  const res = await authFetch('/commission/settlement/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    data: SettlementRunRecord;
    entries: SettlementLineRecord[];
    meta: { entryCount: number };
  }>;
}

export async function reconcilePayoutBatch(
  runId: string,
  input: { batchId: string; bankAmount: number },
) {
  const res = await authFetch(`/commission/settlement/runs/${encodeURIComponent(runId)}/reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Reconcile failed (${res.status})`);
  }
  return res.json() as Promise<{
    data: {
      runId: string;
      batchId: string;
      expectedBatchId: string;
      expectedAmount: number;
      bankAmount: number;
      delta: number;
      batchMatched: boolean;
      amountMatched: boolean;
      status: 'MATCHED' | 'MISMATCH';
    };
    meta: { uc: string; sprint: string };
  }>;
}

export type RefundRecord = {
  id: string;
  attributes: {
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | string;
    bookingId: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
    gatewayRef?: string;
    reason?: string;
    ledgerEntryId?: string;
    createdAt: string;
  };
};

export async function fetchRefunds(limit = 50) {
  const res = await authFetch(`/refunds?limit=${limit}`);
  return res.json() as Promise<{ data: RefundRecord[]; meta: { count: number } }>;
}

export async function fetchRefundByPaymentIntent(paymentIntentId: string) {
  const res = await authFetch(`/refunds?paymentIntentId=${encodeURIComponent(paymentIntentId)}`);
  return res.json() as Promise<{ data: RefundRecord | null; meta: { paymentIntentId: string } }>;
}

export async function createRefund(input: {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}) {
  const res = await authFetch('/refunds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: RefundRecord; meta?: { idempotentReplay?: boolean } }>;
}

export async function cancelBookingWithRefund(
  bookingId: string,
  input: { reason?: string; initiateRefund?: boolean },
) {
  const res = await authFetch(`/bookings/${encodeURIComponent(bookingId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    data: { id: string; attributes: { status: string } };
    refund?: RefundRecord;
  }>;
}

export type TimelineFilter = 'all' | 'state' | 'payment' | 'system';

export type BookingDetail = {
  data: {
    id: string;
    attributes: {
      status: string;
      unitId: string;
      leadId?: string;
      expiresAt: string;
      depositAmount?: number;
      createdAt: string;
    };
  };
  meta: { tenantId: string; allowedTransitions: string[] };
};

export type BookingTimelineEntry = {
  timestamp: string;
  event: string;
  actor: string;
  description: string;
  category: string;
  correlationId?: string;
  payloadSummary?: string;
};

export type BookingDomainEvent = {
  eventId: string;
  type: string;
  category: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  actorId?: string;
  correlationId?: string;
};

export async function fetchBooking(bookingId: string) {
  const res = await authFetch(`/bookings/${encodeURIComponent(bookingId)}`);
  return res.json() as Promise<BookingDetail>;
}

export async function fetchBookingTimeline(bookingId: string, filter: TimelineFilter = 'all') {
  const qs = filter === 'all' ? '' : `?filter=${filter}`;
  const res = await authFetch(`/bookings/${encodeURIComponent(bookingId)}/timeline${qs}`);
  return res.json() as Promise<{ data: BookingTimelineEntry[]; meta: { count: number; filter: TimelineFilter } }>;
}

export async function fetchBookingEvents(bookingId: string, filter: TimelineFilter = 'all') {
  const qs = filter === 'all' ? '' : `?filter=${filter}`;
  const res = await authFetch(`/bookings/${encodeURIComponent(bookingId)}/events${qs}`);
  return res.json() as Promise<{ data: BookingDomainEvent[]; meta: { count: number } }>;
}

export type UnitDetail = {
  data: {
    id: string;
    listingId: string;
    attributes: {
      code: string;
      projectName: string;
      projectId?: string;
      title: string;
      description: string;
      highlights: string[];
      basePrice: number;
      priceDisplay: number | null;
      bedrooms: number;
      floor: number;
      area: number;
      unitStatus: string;
      verified: boolean;
      antiDriftStatus: string;
      thumbnailUrl?: string | null;
      city?: string | null;
      district?: string | null;
    };
  };
  meta: { tenantId: string; privacyPolicyVersion: string };
};

export type LeadSubmitResult = {
  data: {
    id: string;
    attributes: {
      fullName: string;
      phone: string;
      tier: string;
      status: string;
    };
  };
};

export async function fetchUnitDetail(unitId: string): Promise<UnitDetail> {
  const res = await fetch(`${API_BASE}/search/units/${encodeURIComponent(unitId)}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Unit not found (${res.status})`);
  }
  return res.json();
}

export async function submitLead(input: {
  fullName: string;
  phone: string;
  email?: string;
  message?: string;
  unitId: string;
  listingId: string;
  consent: { privacyAccepted: boolean; marketing?: boolean; privacyPolicyVersion: string };
  utm?: Record<string, string>;
  campaignId?: string;
  source?: 'PUBLIC_UNIT_DETAIL' | 'PUBLIC_SERP' | 'PUBLIC_FORM';
}) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': DEFAULT_TENANT_ID,
    },
    body: JSON.stringify({
      ...input,
      source: input.source ?? 'PUBLIC_UNIT_DETAIL',
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string; title?: string } | null;
    throw new Error(body?.detail ?? body?.title ?? `Submit failed (${res.status})`);
  }
  return res.json() as Promise<LeadSubmitResult>;
}

export type SavedSearchRecord = {
  id: string;
  attributes: {
    visitorId: string;
    intent: string;
    q: string;
    filters: Record<string, unknown>;
    alertFrequency: 'none' | 'daily' | 'instant';
    marketingConsent: boolean;
    createdAt: string;
  };
};

export async function savePublicSearch(input: {
  visitorId: string;
  intent?: string;
  q?: string;
  filters?: Record<string, unknown>;
  alertFrequency?: 'none' | 'daily' | 'instant';
  marketingConsent?: boolean;
}) {
  const res = await fetch(`${API_BASE}/saved-searches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEFAULT_TENANT_ID },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Không lưu được tìm kiếm (${res.status})`);
  return res.json() as Promise<{ data: SavedSearchRecord }>;
}

export async function fetchSavedSearches(visitorId: string) {
  const res = await fetch(
    `${API_BASE}/saved-searches?visitorId=${encodeURIComponent(visitorId)}`,
    { headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID } },
  );
  if (!res.ok) throw new Error(`Không tải được tìm kiếm đã lưu (${res.status})`);
  return res.json() as Promise<{ data: SavedSearchRecord[] }>;
}

export async function deleteSavedSearch(id: string, visitorId: string) {
  const res = await fetch(
    `${API_BASE}/saved-searches/${encodeURIComponent(id)}?visitorId=${encodeURIComponent(visitorId)}`,
    { method: 'DELETE', headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID } },
  );
  if (!res.ok) throw new Error(`Không xóa được (${res.status})`);
  return res.json();
}

export async function requestViewing(input: {
  fullName: string;
  phone: string;
  email?: string;
  unitId?: string;
  projectId?: string;
  listingId?: string;
  requestedSlot?: string;
  note?: string;
  inquiryType?: string;
  consent: { privacyAccepted: boolean; privacyPolicyVersion: string; marketing?: boolean };
}) {
  const res = await fetch(`${API_BASE}/viewings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEFAULT_TENANT_ID },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Đặt lịch thất bại (${res.status})`);
  }
  return res.json() as Promise<{ data: { id: string }; meta: { leadId: string; deduplicated?: boolean } }>;
}

export type ViewingRecord = {
  id: string;
  attributes: {
    leadId: string;
    unitId: string | null;
    projectId: string | null;
    requestedSlot: string | null;
    mode: string;
    status: string;
    outcome: string | null;
    note: string | null;
    createdAt: string;
  };
};

export async function fetchViewings() {
  const res = await authFetch('/viewings');
  return res.json() as Promise<{ data: ViewingRecord[] }>;
}

export async function patchViewing(
  viewingId: string,
  body: { status?: string; outcome?: string; note?: string },
) {
  const res = await authFetch(`/viewings/${encodeURIComponent(viewingId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ data: ViewingRecord }>;
}

export type LeadRegistrationRecord = {
  id: string;
  attributes: {
    fullName: string;
    phone: string;
    projectId: string;
    unitId: string | null;
    leadId?: string;
    registeredBy: string;
    status: string;
    protectedUntil: string;
    intent: string;
    createdAt: string;
  };
};

export async function fetchLeadRegistrations() {
  const res = await authFetch('/lead-registrations');
  return res.json() as Promise<{ data: LeadRegistrationRecord[]; meta: { result?: string } }>;
}

export async function registerLeadCustomer(input: {
  fullName: string;
  phone: string;
  projectId: string;
  unitId?: string;
  intent?: string;
  note?: string;
}) {
  const res = await authFetch('/lead-registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: LeadRegistrationRecord; meta: { result: string } }>;
}

export type GrUnit = {
  id: string;
  attributes: {
    code: string;
    status: string;
    basePrice: number;
    area: number;
    bedrooms: number;
    floor: number | null;
    projectId: string;
    version: number;
    updatedAt: string;
  };
};

export type GrUnitFilters = {
  status?: string;
  projectId?: string;
  limit?: number;
};

export type AuditEventRecord = {
  id: string;
  attributes: {
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    payload?: Record<string, unknown> | null;
    actorId?: string | null;
    createdAt: string;
  };
};

export type AuditListResponse = {
  data: AuditEventRecord[];
  meta: {
    count: number;
    source: string;
    filters?: Record<string, string | undefined>;
  };
};

export async function fetchAuditEvents(filters: {
  entityType?: string;
  entityId?: string;
  bookingId?: string;
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<AuditListResponse> {
  const qs = new URLSearchParams();
  if (filters.entityType) qs.set('entityType', filters.entityType);
  if (filters.entityId) qs.set('entityId', filters.entityId);
  if (filters.bookingId) qs.set('bookingId', filters.bookingId);
  if (filters.action) qs.set('action', filters.action);
  if (filters.actorId) qs.set('actorId', filters.actorId);
  if (filters.dateFrom) qs.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) qs.set('dateTo', filters.dateTo);
  if (filters.limit) qs.set('limit', String(filters.limit));
  const query = qs.toString();
  const res = await authFetch(`/audit/events${query ? `?${query}` : ''}`);
  return res.json() as Promise<AuditListResponse>;
}

export async function downloadAuditExport(filters: {
  entityType?: string;
  entityId?: string;
  bookingId?: string;
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  const session = requireSession();
  const qs = new URLSearchParams();
  if (filters.entityType) qs.set('entityType', filters.entityType);
  if (filters.entityId) qs.set('entityId', filters.entityId);
  if (filters.bookingId) qs.set('bookingId', filters.bookingId);
  if (filters.action) qs.set('action', filters.action);
  if (filters.actorId) qs.set('actorId', filters.actorId);
  if (filters.dateFrom) qs.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) qs.set('dateTo', filters.dateTo);
  if (filters.limit) qs.set('limit', String(filters.limit));
  const query = qs.toString();
  const res = await fetch(`${API_BASE}/audit/events/export.csv${query ? `?${query}` : ''}`, {
    headers: authHeaders(session),
  });
  if (!res.ok) throw new Error(`Audit export failed (${res.status})`);
  return res.blob();
}

export async function fetchUnitAudit(unitId: string, limit = 20) {
  return fetchAuditEvents({ entityType: 'unit', entityId: unitId, limit });
}

export type DriftCheckResult = {
  data: {
    unitId: string;
    unitCode: string;
    basePrice: number;
    area: number;
    unitStatus: string;
    status: 'PASS' | 'FLAG' | 'BLOCK';
    findings: {
      field: string;
      severity: 'PASS' | 'FLAG' | 'BLOCK';
      message: string;
      grValue?: string | number;
      listingValue?: string | number;
    }[];
    checkedAt: string;
  };
};

export type ListingRecord = {
  id: string;
  attributes: {
    title: string;
    description: string;
    status: string;
    unitId: string;
    verified: boolean;
    antiDriftStatus: string;
    driftReport?: DriftCheckResult['data'] | null;
    highlights: string[];
    priceDisplay?: number;
    rejectReason?: string | null;
    unitCode?: string;
    basePrice?: number;
    updatedAt: string;
  };
};

export async function fetchGrUnits(statusOrFilters?: string | GrUnitFilters) {
  const filters: GrUnitFilters =
    typeof statusOrFilters === 'string' ? { status: statusOrFilters } : (statusOrFilters ?? {});
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.projectId) qs.set('projectId', filters.projectId);
  if (filters.limit) qs.set('limit', String(filters.limit));
  const query = qs.toString();
  const res = await authFetch(`/units${query ? `?${query}` : ''}`);
  return res.json() as Promise<{ data: GrUnit[]; meta: { count: number; projectId?: string } }>;
}

export type UnitVersionRow = {
  version: number;
  attributes: {
    basePrice: number;
    status: string;
    changedAt: string;
    changedBy: string | null;
    reason: string | null;
    action: string;
  };
};

export type UnitSnapshotData = {
  id: string;
  attributes: {
    unitId: string;
    code: string;
    version: number;
    basePrice: number;
    status: string;
    asOf: string;
    matchedAt: string;
    changedBy: string | null;
    reason: string | null;
    source: 'audit_replay' | 'current';
  };
};

export async function fetchUnitVersions(unitId: string) {
  const res = await authFetch(`/units/${encodeURIComponent(unitId)}/versions`);
  if (!res.ok) throw new Error(`Unit versions failed: ${res.status}`);
  return res.json() as Promise<{
    data: UnitVersionRow[];
    meta: { unitId: string; unitCode: string; count: number; currentVersion: number };
  }>;
}

export async function fetchUnitSnapshotAt(unitId: string, at: string) {
  const qs = new URLSearchParams({ at });
  const res = await authFetch(`/units/${encodeURIComponent(unitId)}/snapshot?${qs.toString()}`);
  if (!res.ok) throw new Error(`Unit snapshot failed: ${res.status}`);
  return res.json() as Promise<{ data: UnitSnapshotData; meta: { unitCode: string; at: string } }>;
}

export async function downloadUnitVersionsCsv(unitId: string) {
  const session = requireSession();
  const res = await fetch(`${API_BASE}/units/${encodeURIComponent(unitId)}/versions/export.csv`, {
    headers: authHeaders(session),
  });
  if (!res.ok) throw new Error(`Export versions failed (${res.status})`);
  return res.blob();
}

export type ProductGraphKpi = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  hold: number;
  absorptionRate: number;
};

export type ProductGraphUnitNode = {
  id: string;
  code: string;
  status: string;
  basePrice: number;
  area: number;
  bedrooms: number;
  floor: number;
};

export type ProductGraphFloorNode = {
  id: string;
  floor: number;
  label: string;
  stats: ProductGraphKpi;
  units: ProductGraphUnitNode[];
};

export type ProductGraphBuildingNode = {
  id: string;
  code: string;
  label: string;
  stats: ProductGraphKpi;
  absorptionRate: number;
  floors: ProductGraphFloorNode[];
};

export type ProductGraphData = {
  project: {
    id: string;
    code: string;
    name: string;
    stats: ProductGraphKpi;
  };
  buildings: ProductGraphBuildingNode[];
  nodes: {
    id: string;
    type: 'project' | 'building' | 'floor' | 'unit';
    label: string;
    parentId?: string;
    meta?: Record<string, unknown>;
  }[];
  edges: { id: string; source: string; target: string }[];
};

export async function fetchProductGraph(
  projectId: string,
  filters?: { building?: string; status?: string; minPrice?: number; maxPrice?: number },
) {
  const qs = new URLSearchParams();
  if (filters?.building) qs.set('building', filters.building);
  if (filters?.status) qs.set('status', filters.status);
  if (filters?.minPrice !== undefined) qs.set('minPrice', String(filters.minPrice));
  if (filters?.maxPrice !== undefined) qs.set('maxPrice', String(filters.maxPrice));
  const query = qs.toString();
  const res = await authFetch(
    `/projects/${encodeURIComponent(projectId)}/graph${query ? `?${query}` : ''}`,
  );
  if (!res.ok) throw new Error(`Product graph failed: ${res.status}`);
  return res.json() as Promise<{ data: ProductGraphData; meta: { unitCount: number; uc: string } }>;
}

export async function patchGrUnit(
  unitId: string,
  input: {
    basePrice?: number;
    status?: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'HOLD';
    reason?: string;
    expectedVersion: number;
  },
) {
  const session = requireSession();
  const res = await fetch(`${API_BASE}/units/${encodeURIComponent(unitId)}`, {
    method: 'PATCH',
    headers: {
      ...(authHeaders(session) as Record<string, string>),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (res.status === 409) {
    const body = (await res.json().catch(() => null)) as {
      detail?: string;
      currentVersion?: number;
    } | null;
    const err = new Error(body?.detail ?? 'Version conflict (409)');
    (err as Error & { status: number; currentVersion?: number }).status = 409;
    if (body?.currentVersion !== undefined) {
      (err as Error & { currentVersion?: number }).currentVersion = body.currentVersion;
    }
    throw err;
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `PATCH unit failed (${res.status})`);
  }
  return res.json() as Promise<{ data: GrUnit }>;
}

export type UnitImportPreviewRow = {
  rowNumber: number;
  code: string;
  floor: number | null;
  area: number;
  bedrooms: number;
  basePrice: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'HOLD';
  valid: boolean;
  errors: string[];
  duplicateInFile?: boolean;
  diffAction?: 'CREATE' | 'UPDATE' | 'UNCHANGED';
  diffFields?: string[];
  existingUnitId?: string;
};

export async function previewUnitImport(input: { projectId: string; csvText: string }) {
  const res = await authFetch('/units/import/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Import preview failed (${res.status})`);
  }
  return res.json() as Promise<{
    data: { rows: UnitImportPreviewRow[]; headers: string[] };
    meta: {
      total: number;
      validCount: number;
      invalidCount: number;
      createCount: number;
      updateCount: number;
      unchangedCount: number;
    };
  }>;
}

export async function commitUnitImport(input: {
  projectId: string;
  rows: {
    code: string;
    floor: number | null;
    area: number;
    bedrooms: number;
    basePrice: number;
    status: UnitImportPreviewRow['status'];
    diffAction: 'CREATE' | 'UPDATE';
  }[];
  reason?: string;
}) {
  const res = await authFetch('/units/import/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Import commit failed (${res.status})`);
  }
  return res.json() as Promise<{
    data: { created: GrUnit[]; updated: GrUnit[] };
    meta: {
      createdCount: number;
      updatedCount: number;
      skippedCount: number;
      skipped: { code: string; reason: string }[];
    };
  }>;
}

export type CopilotTone = 'premium' | 'standard' | 'investment';

export type CopilotGenerateResponse = {
  data: {
    id: string;
    attributes: {
      task: 'LISTING_DESCRIPTION' | 'LISTING_TITLE';
      title: string;
      content: string;
      disclaimer: string;
      requiresApproval: true;
      modelVersion: string;
      tone: CopilotTone;
      language: 'vi' | 'en';
      latencyMs: number;
    };
  };
};

export async function generateListingCopilot(input: {
  unitId: string;
  listingId?: string;
  task?: 'LISTING_DESCRIPTION' | 'LISTING_TITLE';
  tone?: CopilotTone;
  language?: 'vi' | 'en';
  context?: Record<string, unknown>;
}) {
  const res = await authFetch('/ai/copilot/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'LISTING_DESCRIPTION',
      language: 'vi',
      ...input,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string; code?: string } | null;
    throw new Error(body?.detail ?? `AI copilot failed (${res.status})`);
  }
  return res.json() as Promise<CopilotGenerateResponse>;
}

export async function checkListingDrift(input: {
  unitId: string;
  priceDisplay?: number;
  areaDisplay?: number;
}) {
  const res = await authFetch('/listings/drift-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<DriftCheckResult>;
}

export async function createListing(input: {
  unitId: string;
  title: string;
  description: string;
  highlights?: string[];
  priceDisplay?: number;
}) {
  const res = await authFetch('/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: ListingRecord }>;
}

export async function fetchListings(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await authFetch(`/listings${qs}`);
  return res.json() as Promise<{ data: ListingRecord[]; meta: { count: number; status?: string } }>;
}

export async function submitListingReview(listingId: string) {
  const res = await authFetch(`/listings/${encodeURIComponent(listingId)}/submit-review`, {
    method: 'POST',
  });
  return res.json() as Promise<{ data: ListingRecord }>;
}

export async function approveListing(listingId: string) {
  const res = await authFetch(`/listings/${encodeURIComponent(listingId)}/approve`, {
    method: 'PATCH',
  });
  return res.json() as Promise<{ data: ListingRecord }>;
}

export async function rejectListing(listingId: string, reason: string, code?: string) {
  const res = await authFetch(`/listings/${encodeURIComponent(listingId)}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, code }),
  });
  return res.json() as Promise<{ data: ListingRecord }>;
}

export type LeadImportPreviewRow = {
  rowNumber: number;
  fullName: string;
  phone: string;
  email?: string;
  unitId?: string;
  message?: string;
  valid: boolean;
  errors: string[];
  duplicatePhone?: boolean;
};

export async function previewLeadImport(csvText: string) {
  const res = await authFetch('/leads/import/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvText }),
  });
  return res.json() as Promise<{
    data: { rows: LeadImportPreviewRow[]; headers: string[] };
    meta: { total: number; validCount: number; invalidCount: number; duplicateCount: number };
  }>;
}

export async function commitLeadImport(input: {
  rows: { fullName: string; phone: string; email?: string; unitId?: string; message?: string }[];
  defaultSource?: string;
  skipDuplicates?: boolean;
  assignTo?: string;
}) {
  const res = await authFetch('/leads/import/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{
    data: LeadRecord[];
    meta: { createdCount: number; skippedCount: number; skipped: { phone: string; reason: string }[] };
  }>;
}

export type ListingMediaRecord = {
  id: string;
  attributes: {
    listingId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder: number;
    isCover: boolean;
    scanStatus: 'PENDING' | 'CLEAN' | 'QUARANTINE';
    url: string;
    createdAt: string;
  };
};

export async function fetchListingMedia(listingId: string) {
  const res = await authFetch(`/listings/${encodeURIComponent(listingId)}/media`);
  return res.json() as Promise<{ data: ListingMediaRecord[]; meta: { count: number } }>;
}

export async function uploadListingMedia(listingId: string, file: File) {
  const session = requireSession();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/listings/${encodeURIComponent(listingId)}/media/upload`, {
    method: 'POST',
    headers: authHeaders(session),
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Upload failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ListingMediaRecord }>;
}

export async function deleteListingMedia(listingId: string, mediaId: string) {
  const res = await authFetch(
    `/listings/${encodeURIComponent(listingId)}/media/${encodeURIComponent(mediaId)}`,
    { method: 'DELETE' },
  );
  return res.json() as Promise<{ data: { id: string; deleted: boolean } }>;
}

export async function reorderListingMedia(listingId: string, mediaIds: string[]) {
  const res = await authFetch(`/listings/${encodeURIComponent(listingId)}/media/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaIds }),
  });
  return res.json() as Promise<{ data: ListingMediaRecord[] }>;
}

export async function setListingMediaCover(listingId: string, mediaId: string) {
  const res = await authFetch(
    `/listings/${encodeURIComponent(listingId)}/media/${encodeURIComponent(mediaId)}/cover`,
    { method: 'PATCH' },
  );
  return res.json() as Promise<{ data: ListingMediaRecord }>;
}

export async function scanListingMedia(listingId: string, mediaId: string) {
  const res = await authFetch(
    `/listings/${encodeURIComponent(listingId)}/media/${encodeURIComponent(mediaId)}/scan`,
    { method: 'POST' },
  );
  return res.json() as Promise<{ data: ListingMediaRecord }>;
}

export async function fetchListingMediaBlob(listingId: string, mediaId: string) {
  const session = requireSession();
  const res = await fetch(
    `${API_BASE}/listings/${encodeURIComponent(listingId)}/media/${encodeURIComponent(mediaId)}/file`,
    { headers: authHeaders(session) },
  );
  if (!res.ok) throw new Error(`Media fetch failed (${res.status})`);
  return res.blob();
}

export const BOOKING_CANCEL_REASONS = [
  { value: 'BUYER_WITHDREW', label: 'Buyer rút lui' },
  { value: 'CHANGE_OF_MIND', label: 'Đổi ý / chọn căn khác' },
  { value: 'UNIT_UNAVAILABLE', label: 'Căn không còn khả dụng' },
  { value: 'PRICING_ISSUE', label: 'Vấn đề giá / chính sách' },
  { value: 'DUPLICATE_BOOKING', label: 'Booking trùng' },
  { value: 'OTHER', label: 'Khác' },
] as const;

export function newIdempotencyKey(prefix = 'web') {
  return `${prefix}_${crypto.randomUUID()}`;
}

export type LeadRecord = {
  id: string;
  attributes: {
    fullName: string;
    phone: string;
    score: number;
    tier: string;
    source: string;
    status: string;
    routingStatus?: string;
    scoreStatus?: 'PENDING' | 'SCORED' | 'UNSCORED';
    assignedTo?: string;
    scoringMeta?: Record<string, unknown> | null;
    unitId?: string;
    utmCampaign?: string | null;
    campaignId?: string | null;
    lostReason?: string;
    lastActivityAt?: string;
    updatedAt?: string;
  };
};

export type ActivityRecord = {
  id: string;
  attributes: {
    leadId: string;
    type: string;
    summary?: string;
    metadata?: Record<string, unknown> | null;
    createdBy?: string | null;
    createdAt: string;
  };
};

export const PIPELINE_STAGES = [
  { code: 'NEW', label: 'Mới' },
  { code: 'CONTACTED', label: 'Đã liên hệ' },
  { code: 'VIEWING', label: 'Xem nhà' },
  { code: 'NEGOTIATING', label: 'Đàm phán' },
  { code: 'BOOKING', label: 'Booking' },
  { code: 'WON', label: 'Thành công' },
  { code: 'LOST', label: 'Thất bại' },
] as const;

export const LOST_REASONS = [
  { code: 'NO_BUDGET', label: 'Không đủ ngân sách' },
  { code: 'NO_RESPONSE', label: 'Không phản hồi' },
  { code: 'BOUGHT_ELSEWHERE', label: 'Mua nơi khác' },
  { code: 'PRICE', label: 'Giá' },
  { code: 'FINANCE', label: 'Tài chính / vay' },
  { code: 'PRODUCT_MISMATCH', label: 'Không khớp sản phẩm' },
  { code: 'COMPETITOR', label: 'Đối thủ' },
  { code: 'POLICY_DELAY', label: 'Chậm chính sách' },
  { code: 'LEGAL', label: 'Pháp lý' },
  { code: 'OTHER', label: 'Khác' },
] as const;

export async function fetchLeads() {
  const res = await authFetch('/leads');
  return res.json() as Promise<{ data: LeadRecord[]; meta: { count: number } }>;
}

export type HotConversionMetrics = {
  hotTotal: number;
  hotContacted: number;
  hotBooked: number;
  hotDeposited: number;
  hotConversionRate: number;
  hotResponseSlaMs: number | null;
};

export async function fetchHotConversion() {
  const res = await authFetch('/ai/scoring/hot-conversion');
  if (!res.ok) throw new Error(`Hot conversion failed: ${res.status}`);
  return res.json() as Promise<{ data: HotConversionMetrics }>;
}

export async function fetchLead(leadId: string) {
  const res = await authFetch(`/leads/${encodeURIComponent(leadId)}`);
  if (!res.ok) throw new Error(`Lead failed: ${res.status}`);
  return res.json() as Promise<{ data: LeadRecord; meta: { tenantId: string } }>;
}

export type RoutingRules = {
  attributes: {
    enabled: boolean;
    hotTierMinScore: number;
    strategy: 'HOT_ROUND_ROBIN';
    assignOnTier: 'HOT';
    agentPool: { id: string; email: string; role: string }[];
  };
};

export async function fetchRoutingRules() {
  const res = await authFetch('/crm/routing-rules');
  return res.json() as Promise<{ data: RoutingRules; meta: { tenantId: string } }>;
}

export async function patchRoutingRules(input: Partial<RoutingRules['attributes']>) {
  const res = await authFetch('/crm/routing-rules', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `PATCH routing failed (${res.status})`);
  }
  return res.json() as Promise<{ data: RoutingRules }>;
}

export async function fetchBookings(filters?: { leadId?: string; status?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (filters?.leadId) qs.set('leadId', filters.leadId);
  if (filters?.status) qs.set('status', filters.status);
  if (filters?.limit) qs.set('limit', String(filters.limit));
  const query = qs.toString();
  const res = await authFetch(`/bookings${query ? `?${query}` : ''}`);
  return res.json() as Promise<{ data: BookingDetail['data'][]; meta: { count: number } }>;
}

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

export type BuyerDealNotification = {
  id: string;
  channel: 'IN_APP' | 'SMS' | 'ZNS';
  title: string;
  body: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
};

export type BuyerDealDetail = BuyerDealSummary & {
  allowedTransitions: string[];
  steps: { id: string; label: string; done: boolean; active: boolean }[];
  paymentIntentId?: string;
  notes?: string;
  notifications?: BuyerDealNotification[];
};

export async function fetchBuyerDeals() {
  const res = await fetch(`${API_BASE}/portal/buyer/deals`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Buyer deals failed: ${res.status}`);
  return res.json() as Promise<{ data: BuyerDealSummary[]; meta: { count: number } }>;
}

export async function fetchBuyerDeal(bookingId: string) {
  const res = await fetch(`${API_BASE}/portal/buyer/deals/${encodeURIComponent(bookingId)}`, {
    headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
  });
  if (!res.ok) throw new Error(`Buyer deal failed: ${res.status}`);
  return res.json() as Promise<{ data: { attributes: BuyerDealDetail }; meta: { tenantId: string } }>;
}

export async function sendBuyerDealNotifyStub(bookingId: string) {
  const res = await fetch(
    `${API_BASE}/portal/buyer/deals/${encodeURIComponent(bookingId)}/notifications/stub`,
    {
      method: 'POST',
      headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID },
    },
  );
  if (!res.ok) throw new Error(`Buyer notify stub failed: ${res.status}`);
  return res.json() as Promise<{ data: { sent: boolean; channel: string; deliveryId?: string } }>;
}

export type LeadScoreExplainFactor = {
  key: string;
  label: string;
  value: unknown;
  impact: number;
  note: string;
};

export type LeadScoreExplain = {
  leadId: string;
  score: number;
  tier: string;
  scoreStatus: string;
  modelVersion: string;
  unscored: boolean;
  lagMs: number | null;
  features: Record<string, unknown>;
  factors: LeadScoreExplainFactor[];
  totalImpact: number;
};

export async function fetchLeadScoreExplain(leadId: string) {
  const res = await authFetch(`/ai/scoring/leads/${encodeURIComponent(leadId)}`);
  if (!res.ok) throw new Error(`Lead score explain failed: ${res.status}`);
  return res.json() as Promise<{ data: LeadScoreExplain; meta: { tenantId: string } }>;
}

export async function patchLeadStage(
  leadId: string,
  input: { stage: string; lostReason?: string; unitId?: string; notes?: string },
) {
  const res = await authFetch(`/leads/${encodeURIComponent(leadId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `PATCH lead failed (${res.status})`);
  }
  return res.json() as Promise<{ data: LeadRecord }>;
}

export async function fetchActivities(leadId?: string) {
  const qs = leadId ? `?leadId=${encodeURIComponent(leadId)}` : '';
  const res = await authFetch(`/activities${qs}`);
  return res.json() as Promise<{ data: ActivityRecord[]; meta: { count: number } }>;
}

export async function createActivity(input: {
  leadId: string;
  type: 'CALL' | 'NOTE' | 'VISIT' | 'ZALO' | 'MEETING';
  summary?: string;
}) {
  const res = await authFetch('/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Create activity failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ActivityRecord }>;
}

export type ContractTemplate = {
  id: string;
  label: string;
  description: string;
  category: string;
  version: string;
};

export type ContractPreviewData = {
  templateId: string;
  templateLabel: string;
  bookingId: string;
  leadId?: string;
  mergedText: string;
  mergeContext: Record<string, unknown>;
};

export type ContractDraft = {
  id: string;
  attributes: {
    templateId: string;
    templateLabel: string;
    bookingId: string;
    leadId?: string;
    status: 'DRAFT' | 'SIGNED';
    mergedText: string;
    createdAt: string;
    createdBy?: string;
    notes?: string;
    signedAt?: string;
    signedBy?: string;
    documentVaultRef?: string;
    documentId?: string;
    signatureRef?: string;
  };
};

export type ContractSignSession = {
  contractId: string;
  bookingId: string;
  templateLabel: string;
  status: 'DRAFT' | 'SIGNED';
  mergedText: string;
  buyerName: string;
  unitCode: string;
  otpHint?: string;
  otpSent?: boolean;
  signingUrl?: string;
  envelopeId?: string;
  provider?: string;
  providerMode?: string;
};

export async function fetchContractSignSession(contractId: string, tenantId = DEFAULT_TENANT_ID) {
  const res = await fetch(
    `${API_BASE}/contracts/${encodeURIComponent(contractId)}/sign-session`,
    { headers: { 'X-Tenant-Id': tenantId } },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Sign session failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ContractSignSession }>;
}

export async function signContract(
  contractId: string,
  input: { signerName: string; otp: string; consent: boolean; envelopeId?: string },
  tenantId = DEFAULT_TENANT_ID,
) {
  const res = await fetch(`${API_BASE}/contracts/${encodeURIComponent(contractId)}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `E-sign failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ContractDraft; meta: { status: string } }>;
}

export type AnomalySignal = {
  code: string;
  label: string;
  severity: string;
  score: number;
  detail: string;
};

export type AnomalyRecord = {
  id: string;
  listingId: string;
  unitId: string;
  unitCode?: string;
  title: string;
  listingStatus: string;
  signals: AnomalySignal[];
  mlScore: number;
  severity: string;
  queueStatus: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  flaggedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  resolvedBy?: string;
};

export async function fetchAiAnomalies() {
  const res = await authFetch('/ai/anomalies');
  if (!res.ok) throw new Error(`Anomaly queue failed: ${res.status}`);
  return res.json() as Promise<{
    data: AnomalyRecord[];
    meta: { count: number; openCount: number };
  }>;
}

export async function resolveAiAnomaly(
  anomalyId: string,
  input: { action: 'RESOLVE' | 'DISMISS'; note?: string },
) {
  const res = await authFetch(`/ai/anomalies/${encodeURIComponent(anomalyId)}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Resolve anomaly failed (${res.status})`);
  }
  return res.json() as Promise<{ data: AnomalyRecord }>;
}

export type PaymentGatewayRule = {
  id: string;
  label: string;
  priority: number;
  match: { method?: string; minAmount?: number; maxAmount?: number };
  primary: string;
  fallback: string | null;
  enabled: boolean;
};

export async function fetchPaymentGatewayRules() {
  const res = await authFetch('/integrations/payment-gateways');
  if (!res.ok) throw new Error(`Payment gateways failed: ${res.status}`);
  return res.json() as Promise<{ data: { rules: PaymentGatewayRule[] }; meta: { screen: string } }>;
}

export async function simulatePaymentGatewayRoute(input: {
  method: 'MOCK' | 'VNPAY';
  amount: number;
  primaryFailed?: boolean;
}) {
  const res = await authFetch('/integrations/payment-gateways/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Simulate route failed (${res.status})`);
  }
  return res.json() as Promise<{
    data: { decision: { ruleId: string; selected: string; usedFallback: boolean } | null };
  }>;
}

export async function patchPaymentGatewayRule(
  ruleId: string,
  patch: { enabled?: boolean; fallback?: 'MOCK' | 'VNPAY' | null; label?: string },
) {
  const res = await authFetch(`/integrations/payment-gateways/rules/${encodeURIComponent(ruleId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Update gateway rule failed: ${res.status}`);
  return res.json() as Promise<{ data: { rules: PaymentGatewayRule[] } }>;
}

export type ApiPartner = {
  id: string;
  name: string;
  category: string;
  status: string;
  webhookUrl?: string;
  apiKeyPrefix: string;
  rateLimitPerMin: number;
  eventsConsumed: number;
  lastDeliveryAt?: string;
};

export async function fetchApiMarketplace() {
  const res = await authFetch('/integrations/api-marketplace');
  if (!res.ok) throw new Error(`API marketplace failed: ${res.status}`);
  return res.json() as Promise<{
    data: { partners: ApiPartner[]; recentDeliveries: { id: string; event: string; status: string }[] };
    meta: { partnerCount: number };
  }>;
}

export async function registerApiPartner(input: {
  name: string;
  category: 'BANK' | 'VALUATION' | 'ERP' | 'OTHER';
  webhookUrl?: string;
}) {
  const res = await authFetch('/integrations/api-marketplace/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Register partner failed: ${res.status}`);
  return res.json() as Promise<{ data: { partner: ApiPartner; apiKey: string } }>;
}

export async function simulateApiPartnerWebhook(partnerId: string, event?: string) {
  const res = await authFetch(
    `/integrations/api-marketplace/partners/${encodeURIComponent(partnerId)}/webhooks/simulate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    },
  );
  if (!res.ok) throw new Error(`Webhook simulate failed: ${res.status}`);
  return res.json();
}

export type MarketplaceAgencyRank = {
  agencyTenantId: string;
  agencyName: string;
  rank: number;
  slaScore: number;
  penaltyPoints: number;
  status: 'GOOD' | 'WARNING' | 'PENALIZED';
  openApplications: number;
  appealStatus?: string;
};

export async function fetchMarketplaceRankings() {
  const res = await authFetch('/marketing/marketplace/admin/rankings');
  if (!res.ok) throw new Error(`Marketplace rankings failed: ${res.status}`);
  return res.json() as Promise<{ data: MarketplaceAgencyRank[]; meta: { count: number } }>;
}

export async function applyMarketplacePenalty(input: {
  agencyTenantId: string;
  points: number;
  reason: string;
}) {
  const res = await authFetch('/marketing/marketplace/admin/penalties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apply penalty failed: ${res.status}`);
  return res.json() as Promise<{ data: MarketplaceAgencyRank[] }>;
}

export type RegulatoryExportJob = {
  id: string;
  scope: 'AUDIT' | 'BOOKINGS' | 'FULL';
  dateFrom: string;
  dateTo: string;
  status: string;
  manifestSha256?: string;
  fileCount: number;
  createdAt: string;
  readyAt?: string;
  downloadExpiresAt?: string;
};

export async function fetchRegulatoryExportJobs() {
  const res = await authFetch('/regulatory-export/jobs');
  if (!res.ok) throw new Error(`Regulatory export jobs failed: ${res.status}`);
  return res.json() as Promise<{ data: RegulatoryExportJob[]; meta: { count: number } }>;
}

export async function createRegulatoryExportJob(input: {
  scope: 'AUDIT' | 'BOOKINGS' | 'FULL';
  dateFrom: string;
  dateTo: string;
  legalTicketId?: string;
}) {
  const res = await authFetch('/regulatory-export/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Create export job failed (${res.status})`);
  }
  return res.json() as Promise<{ data: RegulatoryExportJob }>;
}

export async function downloadRegulatoryExportPack(jobId: string) {
  const res = await authFetch(`/regulatory-export/jobs/${encodeURIComponent(jobId)}/download`);
  if (!res.ok) throw new Error(`Download export pack failed: ${res.status}`);
  return res.json() as Promise<{ data: { csv: string; manifest: Record<string, unknown>; job: RegulatoryExportJob } }>;
}

export async function fetchContractTemplates() {
  const res = await authFetch('/contracts/templates');
  if (!res.ok) throw new Error(`Contract templates failed: ${res.status}`);
  return res.json() as Promise<{ data: ContractTemplate[]; meta: { count: number } }>;
}

export async function previewContract(input: {
  templateId: string;
  bookingId: string;
  leadId?: string;
  overrides?: { buyerName?: string; buyerPhone?: string; buyerEmail?: string };
}) {
  const res = await authFetch('/contracts/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Contract preview failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ContractPreviewData }>;
}

export async function createContractDraft(input: {
  templateId: string;
  bookingId: string;
  leadId?: string;
  notes?: string;
  overrides?: { buyerName?: string; buyerPhone?: string; buyerEmail?: string };
}) {
  const res = await authFetch('/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Create contract failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ContractDraft; meta: { status: string } }>;
}

export type SlaTask = {
  id: string;
  attributes: {
    fullName: string;
    phone: string;
    status: string;
    tier: string;
    score: number;
    unitId?: string;
    bucket: 'overdue' | 'due_soon';
    idleHours: number;
    hoursRemaining: number | null;
    lastActivityAt?: string;
  };
};

export type SlaTasksData = {
  summary: {
    slaHours: number;
    dueSoonHours: number;
    trackedLeads: number;
    overdueCount: number;
    dueSoonCount: number;
  };
  overdue: SlaTask[];
  dueSoon: SlaTask[];
  recentSlaEvents: ActivityRecord[];
};

export async function fetchSlaTasks() {
  const res = await authFetch('/crm/sla/tasks');
  if (!res.ok) throw new Error(`SLA tasks failed: ${res.status}`);
  return res.json() as Promise<{ data: SlaTasksData; meta: { tenantId: string } }>;
}

export async function sendSlaReminder(
  leadId: string,
  input?: { channel?: 'ZALO' | 'CALL' | 'NOTE'; message?: string },
) {
  const res = await authFetch(`/crm/sla/leads/${encodeURIComponent(leadId)}/remind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `SLA remind failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ActivityRecord; meta: { action: string } }>;
}

export async function escalateSlaLead(leadId: string, reason?: string) {
  const res = await authFetch(`/crm/sla/leads/${encodeURIComponent(leadId)}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `SLA escalate failed (${res.status})`);
  }
  return res.json() as Promise<{ data: ActivityRecord; meta: { action: string } }>;
}

export type CreateBookingResult = {
  data: {
    id: string;
    attributes: {
      status: string;
      unitId: string;
      leadId?: string;
      expiresAt: string;
      depositAmount?: number;
      notes?: string;
    };
  };
  meta?: { idempotentReplay?: boolean };
};

export type PaymentIntentRecord = {
  id: string;
  attributes: {
    status: string;
    bookingId: string;
    amount: number;
    currency: string;
    method: string;
    paymentUrl: string;
    expiresAt: string;
  };
};

export type PaymentCheckout = {
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    method: string;
    paymentUrl?: string;
    expiresAt: string;
    booking: {
      id: string;
      status: string;
      unitId: string;
      unitCode?: string;
      expiresAt: string;
      depositAmount?: number;
    };
  };
  meta?: {
    tenantId?: string;
    smsOtpSent?: boolean;
    sandboxOtp?: string;
  };
};

export async function createBooking(
  input: {
    unitId: string;
    leadId?: string;
    expiryHours?: number;
    depositAmount?: number;
    notes?: string;
  },
  idempotencyKey?: string,
) {
  const session = requireSession();
  const headers: HeadersInit = {
    ...(authHeaders(session) as Record<string, string>),
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) (headers as Record<string, string>)['X-Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string; title?: string } | null;
    throw new Error(body?.detail ?? body?.title ?? `Booking failed (${res.status})`);
  }
  return res.json() as Promise<CreateBookingResult>;
}

export async function createPaymentIntent(input: {
  bookingId: string;
  amount: number;
  method?: 'MOCK' | 'VNPAY';
  returnUrl?: string;
}) {
  const res = await authFetch('/payment-intents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': newIdempotencyKey('pi'),
    },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<{ data: PaymentIntentRecord }>;
}

export async function fetchPaymentCheckout(intentId: string): Promise<PaymentCheckout> {
  const res = await fetch(
    `${API_BASE}/payment-intents/${encodeURIComponent(intentId)}/checkout`,
    { headers: { 'X-Tenant-Id': DEFAULT_TENANT_ID } },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Checkout failed (${res.status})`);
  }
  return res.json();
}

/** Dev MOCK gateway — route API host through Vite proxy */
export function normalizeDevPaymentUrl(paymentUrl: string) {
  try {
    const parsed = new URL(paymentUrl);
    if (parsed.pathname.startsWith('/api/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* keep original */
  }
  return paymentUrl;
}

export async function triggerMockPayment(paymentUrl: string) {
  const url = normalizeDevPaymentUrl(paymentUrl);
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Mock payment failed (${res.status})`);
  }
  return res.json() as Promise<{ simulated?: boolean }>;
}
