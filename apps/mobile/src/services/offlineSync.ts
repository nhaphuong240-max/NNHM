import { markActivityLogSynced } from './activityLog';
import { syncActivityBatch } from './activityApi';
import { readSyncQueue, removeSyncItems } from './syncQueue';
import type { PendingActivityPayload } from '../types/activity';

export type FlushSyncResult = {
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
  remaining: number;
};

export async function flushSyncQueue(): Promise<FlushSyncResult> {
  const queue = await readSyncQueue();
  if (queue.items.length === 0) {
    return { syncedCount: 0, failedCount: 0, skippedCount: 0, remaining: 0 };
  }

  const payloads: PendingActivityPayload[] = queue.items.map((item) => item.payload);
  const response = await syncActivityBatch(payloads);

  const syncedIds = new Set<string>();
  for (const item of queue.items) {
    const clientId = item.payload.metadata.clientRequestId;
    const failed = response.data.failed.some((f) => f.clientRequestId === clientId);
    const skipped = response.data.skipped.includes(clientId);
    if (!failed || skipped) {
      syncedIds.add(item.id);
    }
  }

  if (syncedIds.size > 0) {
    await removeSyncItems([...syncedIds]);
    await markActivityLogSynced([...syncedIds]);
  }

  const remaining = (await readSyncQueue()).items.length;
  return {
    syncedCount: response.data.synced.length,
    failedCount: response.data.failed.length,
    skippedCount: response.data.skipped.length,
    remaining,
  };
}
