import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { registerPushDevice } from '../services/deviceApi';
import {
  registerForPushNotificationsAsync,
  scheduleLocalSlaReminder,
} from '../services/pushNotifications';
import { useAuth } from './useAuth';

export type PushInboxItem = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
};

export function usePushNotifications() {
  const { loggedIn } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushMode, setPushMode] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [inbox, setInbox] = useState<PushInboxItem[]>([]);
  const registeredRef = useRef(false);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      setInbox((prev) =>
        [
          {
            id: notification.request.identifier,
            title: content.title ?? 'WEREAL Agent',
            body: content.body ?? '',
            receivedAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 5),
      );
    });

    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const content = event.notification.request.content;
      setPushStatus(`Mở từ notification: ${content.title ?? 'Agent'}`);
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, []);

  const registerPush = useCallback(async (opts?: { silent?: boolean }) => {
    if (!loggedIn) {
      if (!opts?.silent) setPushStatus('Đăng nhập trước khi bật push.');
      return false;
    }

    const reg = await registerForPushNotificationsAsync();
    if (!reg.token) {
      if (!opts?.silent) {
        setPushStatus(reg.reason ?? 'Không lấy được push token.');
      }
      return false;
    }

    const regResult = await registerPushDevice({
      pushToken: reg.token,
      platform: reg.platform,
      deviceName: 'Expo Agent',
    });
    setPushToken(reg.token.slice(0, 28) + '…');
    setPushMode(regResult.meta?.mode ?? 'registered');
    setPushStatus('Push đã đăng ký với backend.');
    registeredRef.current = true;
    return true;
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn && !registeredRef.current) {
      registerPush({ silent: true }).catch(() => undefined);
    }
    if (!loggedIn) {
      registeredRef.current = false;
      setPushToken(null);
    }
  }, [loggedIn, registerPush]);

  const testLocalPush = useCallback(async () => {
    await scheduleLocalSlaReminder(
      'SLA nhắc việc',
      'Lead ld_02 quá hạn 48h — gọi lại ngay (UC-CRM-06).',
    );
    setPushStatus('Đã lên lịch local notification demo.');
  }, []);

  return {
    pushToken,
    pushMode,
    pushStatus,
    setPushStatus,
    inbox,
    registerPush,
    testLocalPush,
  };
}
