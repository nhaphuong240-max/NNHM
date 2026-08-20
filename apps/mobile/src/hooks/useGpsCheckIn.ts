import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { postActivity } from '../services/activityApi';
import { createClientRequestId, enqueueActivity } from '../services/syncQueue';
import { appendActivityLog } from '../services/activityLog';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuth } from './useAuth';
import { useOfflineSync } from './useOfflineSync';

export type GpsCheckInStatus = 'idle' | 'locating' | 'queued' | 'synced' | 'error';

export function useGpsCheckIn() {
  const { online } = useNetworkStatus();
  const { loggedIn } = useAuth();
  const { refreshPending } = useOfflineSync();
  const [status, setStatus] = useState<GpsCheckInStatus>('idle');
  const [coords, setCoords] = useState<string>('—');
  const [message, setMessage] = useState<string | null>(null);

  const checkIn = useCallback(
    async (leadId: string) => {
      if (!loggedIn) {
        setStatus('error');
        setMessage('Đăng nhập trước khi log GPS (tab Cá nhân).');
        return;
      }
      if (!leadId.trim()) {
        setStatus('error');
        setMessage('Chọn lead để gắn check-in.');
        return;
      }

      setStatus('locating');
      setMessage(null);

      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('error');
        setMessage('Từ chối quyền vị trí.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const clientRequestId = createClientRequestId();
      const payload = {
        leadId: leadId.trim(),
        type: 'VISIT' as const,
        summary: 'GPS check-in hiện trường (UC-UX-01)',
        metadata: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
          altitude: loc.coords.altitude,
          source: 'mobile-gps' as const,
          clientRequestId,
        },
      };

      setCoords(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);

      const logBase = {
        leadId: leadId.trim(),
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      if (!online) {
        await enqueueActivity(payload);
        await appendActivityLog({
          id: clientRequestId,
          ...logBase,
          status: 'queued',
        });
        await refreshPending();
        setStatus('queued');
        setMessage('Offline — đã xếp hàng sync. Mở mạng để đẩy lên server.');
        return;
      }

      try {
        await postActivity(payload);
        await appendActivityLog({
          id: clientRequestId,
          ...logBase,
          status: 'synced',
        });
        setStatus('synced');
        setMessage('Đã ghi activity VISIT + GPS lên CRM.');
      } catch {
        await enqueueActivity(payload);
        await appendActivityLog({
          id: clientRequestId,
          ...logBase,
          status: 'queued',
        });
        await refreshPending();
        setStatus('queued');
        setMessage('API lỗi — đã lưu hàng đợi offline để sync sau.');
      }
    },
    [loggedIn, online, refreshPending],
  );

  return { status, coords, message, checkIn };
}
