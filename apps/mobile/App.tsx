import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { SyncStatusBanner } from './src/components/SyncStatusBanner';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { OfflineSyncProvider, useOfflineSync } from './src/hooks/useOfflineSync';
import { PushNotificationProvider } from './src/hooks/PushNotificationProvider';
import { useAgentSession } from './src/hooks/useAgentSession';
import { brand } from './src/theme/tokens';

function AppShell() {
  const { offline } = useNetworkStatus();
  const { ready } = useAuth();
  const { pendingCount, syncing, lastError } = useOfflineSync();
  useAgentSession();

  if (!ready) {
    return (
      <View style={[styles.root, styles.boot]}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <OfflineBanner visible={offline} />
      <SyncStatusBanner pendingCount={pendingCount} syncing={syncing} lastError={lastError} />
      <AppNavigator />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfflineSyncProvider>
          <PushNotificationProvider>
            <AppShell />
          </PushNotificationProvider>
        </OfflineSyncProvider>
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background },
  boot: { alignItems: 'center', justifyContent: 'center' },
});
