import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TENANT_ID } from '../lib/constants';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export type UnitStatusStreamEvent = {
  unitId: string;
  status: string;
  timestamp: string;
  bookingId?: string;
  leadId?: string;
};

type StreamState = 'connecting' | 'live' | 'offline';

export function useUnitStatusStream(options: {
  enabled?: boolean;
  onStatusChange?: (event: UnitStatusStreamEvent) => void;
}) {
  const { enabled = true, onStatusChange } = options;
  const [state, setState] = useState<StreamState>('connecting');
  const [lastEvent, setLastEvent] = useState<UnitStatusStreamEvent | null>(null);
  const handlerRef = useRef(onStatusChange);

  useEffect(() => {
    handlerRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    if (!enabled) return;

    const url = `${API_BASE}/stream/units?tenantId=${encodeURIComponent(DEFAULT_TENANT_ID)}`;
    const es = new EventSource(url);

    const handleStatus = (raw: MessageEvent) => {
      try {
        const payload =
          typeof raw.data === 'string' ? (JSON.parse(raw.data) as UnitStatusStreamEvent) : raw.data;
        if (!payload?.unitId) return;
        setLastEvent(payload);
        handlerRef.current?.(payload);
      } catch {
        /* ignore malformed event */
      }
    };

    es.addEventListener('open', () => setState('live'));
    es.addEventListener('connected', () => setState('live'));
    es.addEventListener('unit.status.changed', handleStatus as EventListener);
    es.onerror = () => setState('offline');

    return () => {
      es.close();
      setState('offline');
    };
  }, [enabled]);

  return { state, lastEvent };
}
