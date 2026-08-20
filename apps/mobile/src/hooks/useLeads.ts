import { useCallback, useEffect, useState } from 'react';
import { fetchLeads } from '../services/api';
import { readLeadsCache, writeLeadsCache } from '../services/leadsCache';
import type { Lead, LeadsDataSource } from '../types/lead';
import { useNetworkStatus } from './useNetworkStatus';

export interface UseLeadsResult {
  leads: Lead[];
  source: LeadsDataSource;
  syncedAt: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLeads(): UseLeadsResult {
  const { online } = useNetworkStatus();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [source, setSource] = useState<LeadsDataSource>('empty');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback(async () => {
    const cached = await readLeadsCache();
    if (cached && cached.leads.length > 0) {
      setLeads(cached.leads);
      setSyncedAt(cached.meta.syncedAt);
      setSource('cache');
      return true;
    }
    setLeads([]);
    setSource('empty');
    return false;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);

    if (!online) {
      const hadCache = await loadFromCache();
      if (!hadCache) {
        setError('Không có mạng và chưa có dữ liệu cache. Hãy mở app khi online ít nhất một lần.');
      }
      return;
    }

    try {
      const networkLeads = await fetchLeads();
      const payload = await writeLeadsCache(networkLeads);
      setLeads(payload.leads);
      setSyncedAt(payload.meta.syncedAt);
      setSource('network');
    } catch (e) {
      const hadCache = await loadFromCache();
      const message = e instanceof Error ? e.message : 'Lỗi tải leads';
      if (hadCache) {
        setError(`${message} — đang hiển thị bản cache`);
      } else {
        setError(message);
      }
    }
  }, [online, loadFromCache]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [online, refresh]);

  const pullRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return {
    leads,
    source,
    syncedAt,
    loading,
    refreshing,
    error,
    refresh: pullRefresh,
  };
}
