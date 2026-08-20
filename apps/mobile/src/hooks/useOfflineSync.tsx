import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { readSyncQueue } from '../services/syncQueue';
import { flushSyncQueue } from '../services/offlineSync';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuth } from './useAuth';

interface OfflineSyncContextValue {
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  refreshPending: () => Promise<void>;
  flush: () => Promise<{ syncedCount: number; remaining: number }>;
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { online } = useNetworkStatus();
  const { loggedIn } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const wasOfflineRef = useRef(!online);

  const refreshPending = useCallback(async () => {
    const queue = await readSyncQueue();
    setPendingCount(queue.items.length);
  }, []);

  const flush = useCallback(async () => {
    if (!online || !loggedIn) {
      return { syncedCount: 0, remaining: pendingCount };
    }

    setSyncing(true);
    setLastError(null);
    try {
      const result = await flushSyncQueue();
      setLastSyncAt(new Date().toISOString());
      setPendingCount(result.remaining);
      return { syncedCount: result.syncedCount, remaining: result.remaining };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      setLastError(message);
      await refreshPending();
      throw e;
    } finally {
      setSyncing(false);
    }
  }, [online, loggedIn, pendingCount, refreshPending]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    const cameOnline = wasOfflineRef.current && online;
    wasOfflineRef.current = !online;
    if (cameOnline && loggedIn && pendingCount > 0) {
      flush().catch(() => undefined);
    }
  }, [online, loggedIn, pendingCount, flush]);

  const value = useMemo(
    () => ({
      pendingCount,
      syncing,
      lastSyncAt,
      lastError,
      refreshPending,
      flush,
    }),
    [pendingCount, syncing, lastSyncAt, lastError, refreshPending, flush],
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error('useOfflineSync must be used within OfflineSyncProvider');
  }
  return ctx;
}
