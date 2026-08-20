import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PendingActivityPayload, SyncQueueItem, SyncQueuePayload } from '../types/activity';

export const SYNC_QUEUE_KEY = '@wereal/sync-queue/v1';

export function createClientRequestId(): string {
  return `mob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseSyncQueue(json: string | null): SyncQueuePayload | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as SyncQueuePayload;
    if (!parsed?.meta?.updatedAt || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readSyncQueue(): Promise<SyncQueuePayload> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  return parseSyncQueue(raw) ?? { meta: { updatedAt: new Date().toISOString() }, items: [] };
}

export async function writeSyncQueue(items: SyncQueueItem[]): Promise<SyncQueuePayload> {
  const payload: SyncQueuePayload = {
    meta: { updatedAt: new Date().toISOString() },
    items,
  };
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(payload));
  return payload;
}

export async function enqueueActivity(payload: PendingActivityPayload): Promise<SyncQueueItem> {
  const queue = await readSyncQueue();
  const item: SyncQueueItem = {
    id: payload.metadata.clientRequestId,
    kind: 'activity',
    createdAt: new Date().toISOString(),
    payload,
  };
  await writeSyncQueue([...queue.items, item]);
  return item;
}

export async function removeSyncItems(ids: string[]): Promise<SyncQueuePayload> {
  const queue = await readSyncQueue();
  const idSet = new Set(ids);
  return writeSyncQueue(queue.items.filter((item) => !idSet.has(item.id)));
}

export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}
