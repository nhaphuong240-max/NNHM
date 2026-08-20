import { useCallback, useEffect, useState } from 'react';
import { createLead } from '../services/api';
import { postMobileActivity } from '../services/agentActivityApi';
import {
  enqueueLeadCapture,
  readLeadCaptureQueue,
  removeLeadCaptures,
  type PendingLeadCapture,
} from '../services/leadCaptureQueue';
import { useNetworkStatus } from './useNetworkStatus';

export function useLeadCaptureSync() {
  const { offline } = useNetworkStatus();
  const [pending, setPending] = useState<PendingLeadCapture[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await readLeadCaptureQueue());
  }, []);

  const recordLeadCapture = useCallback(async (mode: 'live' | 'queued' | 'synced', count = 1) => {
    if (offline) return;
    try {
      await postMobileActivity('LEAD_CAPTURE', { mode, count });
    } catch {
      /* WAU ping is best-effort */
    }
  }, [offline]);

  const captureLead = useCallback(
    async (input: { fullName: string; phone: string }) => {
      if (offline) {
        await enqueueLeadCapture(input);
        await refresh();
        return { mode: 'queued' as const };
      }
      const created = await createLead(input);
      await recordLeadCapture('live');
      return { mode: 'live' as const, id: created.id };
    },
    [offline, refresh, recordLeadCapture],
  );

  const syncPending = useCallback(async () => {
    if (offline) return;
    const queue = await readLeadCaptureQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    const synced: string[] = [];
    try {
      for (const item of queue) {
        await createLead({
          fullName: item.fullName,
          phone: item.phone,
          source: item.source,
        });
        synced.push(item.id);
      }
      if (synced.length > 0) {
        await removeLeadCaptures(synced);
        await recordLeadCapture('synced', synced.length);
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [offline, refresh, recordLeadCapture]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!offline) void syncPending();
  }, [offline, syncPending]);

  return { pending, syncing, captureLead, syncPending, refresh };
}
