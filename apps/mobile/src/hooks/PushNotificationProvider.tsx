import { createContext, useContext, type ReactNode } from 'react';
import { usePushNotifications } from './usePushNotifications';

type PushContextValue = ReturnType<typeof usePushNotifications>;

const PushNotificationContext = createContext<PushContextValue | null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const value = usePushNotifications();
  return <PushNotificationContext.Provider value={value}>{children}</PushNotificationContext.Provider>;
}

export function usePushNotificationContext() {
  const ctx = useContext(PushNotificationContext);
  if (!ctx) {
    throw new Error('usePushNotificationContext must be used within PushNotificationProvider');
  }
  return ctx;
}
