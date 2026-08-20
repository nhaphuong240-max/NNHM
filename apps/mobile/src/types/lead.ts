export type LeadTier = 'HOT' | 'WARM' | 'NEW';

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  score: number;
  tier: LeadTier;
  source: string;
  updatedAt: string;
}

export interface LeadsCacheMeta {
  syncedAt: string;
}

export interface CachedLeadsPayload {
  meta: LeadsCacheMeta;
  leads: Lead[];
}

export type LeadsDataSource = 'network' | 'cache' | 'empty';
