import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CachedLeadsPayload, Lead } from '../types/lead';

export const LEADS_CACHE_KEY = '@wereal/leads/v1';

export function mapApiLead(raw: {
  id: string;
  attributes: {
    fullName: string;
    phone: string;
    score: number;
    tier: Lead['tier'];
    source: string;
    updatedAt: string;
  };
}): Lead {
  return {
    id: raw.id,
    fullName: raw.attributes.fullName,
    phone: raw.attributes.phone,
    score: raw.attributes.score,
    tier: raw.attributes.tier,
    source: raw.attributes.source,
    updatedAt: raw.attributes.updatedAt,
  };
}

export function parseCachedLeads(json: string | null): CachedLeadsPayload | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as CachedLeadsPayload;
    if (!parsed?.meta?.syncedAt || !Array.isArray(parsed.leads)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readLeadsCache(): Promise<CachedLeadsPayload | null> {
  const raw = await AsyncStorage.getItem(LEADS_CACHE_KEY);
  return parseCachedLeads(raw);
}

export async function writeLeadsCache(leads: Lead[]): Promise<CachedLeadsPayload> {
  const payload: CachedLeadsPayload = {
    meta: { syncedAt: new Date().toISOString() },
    leads,
  };
  await AsyncStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export async function clearLeadsCache(): Promise<void> {
  await AsyncStorage.removeItem(LEADS_CACHE_KEY);
}
