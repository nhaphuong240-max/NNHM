import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { usePushNotificationContext } from '../hooks/PushNotificationProvider';
import { fetchAgentWau } from '../services/agentActivityApi';
import { sendPushStub } from '../services/deviceApi';
import { brand, spacing } from '../theme/tokens';

export function ProfileScreen() {
  const { session, loggedIn, loginDemo, logout } = useAuth();
  const { pushToken, pushStatus, setPushStatus, inbox, registerPush, testLocalPush } =
    usePushNotificationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wau7d, setWau7d] = useState<number | null>(null);
  const [wauSim, setWauSim] = useState<boolean | null>(null);
  const [pushMode, setPushMode] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) {
      setWau7d(null);
      setWauSim(null);
      return;
    }
    fetchAgentWau()
      .then((res) => {
        setWau7d(res.data.wau7d);
        setWauSim(res.data.wauSimEnabled);
      })
      .catch(() => undefined);
  }, [loggedIn]);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginDemo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await logout();
      setPushStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const enablePush = async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await registerPush();
      if (!ok) await testLocalPush();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Push registration failed');
    } finally {
      setLoading(false);
    }
  };

  const testPush = async () => {
    if (!loggedIn) {
      setError('Đăng nhập trước.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await sendPushStub({
        title: 'SLA nhắc việc',
        body: 'Lead ld_02 quá hạn 48h — gọi lại ngay (UC-CRM-06 pilot).',
      });
      const sent = result.data?.sent ?? 0;
      const mode = result.meta?.mode ?? 'pilot-stub';
      setPushMode(mode);
      if (sent === 0) {
        await testLocalPush();
        setPushStatus('Backend stub: chưa có device — đã gửi local notification demo.');
      } else if (mode === 'push-live') {
        setPushStatus(`Push live: đã gửi ${sent} notification qua Expo.`);
      } else {
        setPushStatus(`Backend stub: queued ${sent} push delivery.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Push stub failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>HN</Text>
      </View>
      <Text style={styles.name}>Hoàng Nam</Text>
      <Text style={styles.role}>Agent · UC-ID-03 · UC-UX-01 push</Text>

      <View style={styles.meta}>
        <Text style={styles.row}>
          JWT: {loggedIn ? `● ${session?.tenantId}` : '● Chưa đăng nhập'}
        </Text>
        {session?.email ? <Text style={styles.row}>{session.email}</Text> : null}
        <Text style={styles.row}>Token lưu SecureStore — sống sót restart app</Text>
        {pushToken ? <Text style={styles.row}>Push: {pushToken}</Text> : null}
        {pushMode ? <Text style={styles.row}>Push mode: {pushMode}</Text> : null}
        {wau7d !== null ? (
          <Text style={styles.row}>
            WAU 7d: {wau7d}
            {wauSim === false ? ' · real activity only' : wauSim ? ' · sim ON' : ''}
          </Text>
        ) : null}
        {pushStatus ? <Text style={styles.status}>{pushStatus}</Text> : null}
        {inbox.length > 0 ? (
          <View style={styles.inbox}>
            <Text style={styles.inboxTitle}>Notification inbox (local)</Text>
            {inbox.map((n) => (
              <Text key={n.id} style={styles.inboxRow}>
                {n.title}: {n.body}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={brand.primary} style={{ marginTop: spacing.md }} />
      ) : (
        <View style={styles.actions}>
          {loggedIn ? (
            <>
              <PrimaryButton title="Bật push notification" onPress={enablePush} />
              <PrimaryButton title="Gửi thử SLA reminder" onPress={testPush} variant="outline" />
              <PrimaryButton title="Đăng xuất" onPress={signOut} variant="outline" />
            </>
          ) : (
            <PrimaryButton title="Đăng nhập demo" onPress={signIn} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: brand.background,
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', marginTop: spacing.md, color: brand.primary },
  role: { fontSize: 14, color: brand.muted, marginTop: 4 },
  meta: { marginTop: spacing.xl, alignSelf: 'stretch', gap: spacing.sm, marginBottom: spacing.lg },
  row: { fontSize: 14, color: brand.muted, textAlign: 'center' },
  status: { fontSize: 13, color: brand.success, textAlign: 'center', fontWeight: '600' },
  inbox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: brand.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.border,
  },
  inboxTitle: { fontSize: 11, fontWeight: '700', color: brand.muted, marginBottom: 4 },
  inboxRow: { fontSize: 12, color: brand.primaryDark, marginTop: 2 },
  error: { color: brand.destructive, fontSize: 13, marginBottom: spacing.sm, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
});
