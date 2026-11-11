import { useEffect, useRef, useState } from 'react';

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
  unitId?: string | null;
  tenantId?: string | null;
  enabled?: boolean;
  onStatusChange?: (event: UnitStatusStreamEvent) => void;
}) {
  const { unitId, tenantId, enabled = true, onStatusChange } = options;
  const [state, setState] = useState<StreamState>('connecting');
  const [lastEvent, setLastEvent] = useState<UnitStatusStreamEvent | null>(null);
  const handlerRef = useRef(onStatusChange);

  useEffect(() => {
    handlerRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    if (!enabled || !unitId || !tenantId) {
      setState('offline');
      return;
    }

    const url = `${API_BASE}/stream/units?unitId=${encodeURIComponent(unitId)}&tenantId=${encodeURIComponent(tenantId)}`;
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
  }, [enabled, unitId, tenantId]);

  return { state, lastEvent };
}
