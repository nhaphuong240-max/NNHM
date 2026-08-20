import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushRegistrationResult = {
  token: string | null;
  platform: 'ios' | 'android' | 'unknown';
  granted: boolean;
  reason?: string;
};

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return {
      token: null,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
      granted: false,
      reason: 'Push cần thiết bị thật (Expo Go trên simulator dùng local notification demo).',
    };
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return {
      token: null,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      granted: false,
      reason: 'Quyền notification bị từ chối.',
    };
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return {
    token: tokenData.data,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    granted: true,
  };
}

/** Demo local notification when remote push unavailable (simulator / no token). */
export async function scheduleLocalSlaReminder(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { type: 'SLA_REMINDER' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
}
