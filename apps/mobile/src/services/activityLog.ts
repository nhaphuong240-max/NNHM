import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACTIVITY_LOG_KEY = '@wereal/activity-log/v1';
const MAX_ENTRIES = 20;

export type ActivityLogStatus = 'synced' | 'queued';

export type ActivityLogEntry = {
  id: string;
  leadId: string;
  latitude: number;
  longitude: number;
  status: ActivityLogStatus;
  createdAt: string;
};

export type ActivityLogPayload = {
  meta: { updatedAt: string };
  entries: ActivityLogEntry[];
};

export function parseActivityLog(json: string | null): ActivityLogPayload | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as ActivityLogPayload;
    if (!parsed?.meta?.updatedAt || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readActivityLog(): Promise<ActivityLogEntry[]> {
  const raw = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
  return parseActivityLog(raw)?.entries ?? [];
}

export async function appendActivityLog(
  entry: Omit<ActivityLogEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): Promise<ActivityLogEntry[]> {
  const existing = await readActivityLog();
  const row: ActivityLogEntry = {
    id: entry.id ?? entry.leadId + '_' + Date.now(),
    leadId: entry.leadId,
    latitude: entry.latitude,
    longitude: entry.longitude,
    status: entry.status,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
  const entries = [row, ...existing].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(
    ACTIVITY_LOG_KEY,
    JSON.stringify({ meta: { updatedAt: new Date().toISOString() }, entries }),
  );
  return entries;
}

export async function markActivityLogSynced(clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return;
  const idSet = new Set(clientIds);
  const entries = await readActivityLog();
  const next = entries.map((e) => (idSet.has(e.id) ? { ...e, status: 'synced' as const } : e));
  await AsyncStorage.setItem(
    ACTIVITY_LOG_KEY,
    JSON.stringify({ meta: { updatedAt: new Date().toISOString() }, entries: next }),
  );
}
