import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StatCard } from '../components/StatCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { fetchHealth } from '../services/api';
import { readActivityLog, type ActivityLogEntry } from '../services/activityLog';
import { useLeads } from '../hooks/useLeads';
import { useGpsCheckIn } from '../hooks/useGpsCheckIn';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { RootTabParamList } from '../navigation/AppNavigator';
import { brand, spacing } from '../theme/tokens';

const DEMO_LEADS = ['ld_01', 'ld_02', 'ld_03'];

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [selectedLead, setSelectedLead] = useState('ld_01');
  const { leads } = useLeads();
  const { status, coords, message, checkIn } = useGpsCheckIn();
  const { pendingCount, syncing, flush, lastSyncAt } = useOfflineSync();
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  const reloadLog = async () => {
    setActivityLog(await readActivityLog());
  };

  useEffect(() => {
    reloadLog();
  }, [status, pendingCount, lastSyncAt]);

  useEffect(() => {
    fetchHealth()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  useEffect(() => {
    if (leads.length > 0 && !leads.some((l) => l.id === selectedLead)) {
      setSelectedLead(leads[0].id);
    }
  }, [leads, selectedLead]);

  const leadOptions =
    leads.length > 0
      ? leads.slice(0, 5).map((l) => ({ id: l.id, label: l.fullName }))
      : DEMO_LEADS.map((id) => ({ id, label: id }));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Xin chào, Agent</Text>
      <Text style={styles.sub}>WEREAL Agent Mobile · UC-UX-01 · M-S2-02 GPS</Text>

      <View style={styles.row}>
        <StatCard label="Hot leads" value={leads.filter((l) => l.tier === 'HOT').length || 5} highlight />
        <StatCard label="Chờ sync" value={pendingCount} />
      </View>

      <View style={styles.apiBox}>
        <Text style={styles.apiLabel}>API backend</Text>
        <Text style={[styles.apiStatus, apiOk === false && styles.apiFail]}>
          {apiOk === null ? 'Đang kiểm tra…' : apiOk ? '● Online' : '● Offline (dùng cache + hàng đợi)'}
        </Text>
        {pendingCount > 0 ? (
          <Text style={styles.queueHint}>
            {syncing ? 'Đang sync…' : `${pendingCount} GPS check-in trong hàng đợi`}
          </Text>
        ) : null}
      </View>

      <Text style={styles.section}>Lead check-in</Text>
      <View style={styles.chips}>
        {leadOptions.map((opt) => (
          <PrimaryButton
            key={opt.id}
            title={opt.label}
            variant={selectedLead === opt.id ? 'primary' : 'outline'}
            onPress={() => setSelectedLead(opt.id)}
          />
        ))}
      </View>

      <PrimaryButton
        title="Giữ chỗ 30s từ lead"
        onPress={() =>
          navigation.navigate('Booking', {
            leadId: selectedLead,
            leadName: leadOptions.find((opt) => opt.id === selectedLead)?.label,
          })
        }
      />
      <View style={{ height: spacing.sm }} />
      <PrimaryButton
        title={status === 'locating' ? 'Đang lấy GPS…' : 'Log activity (GPS check-in)'}
        onPress={() => checkIn(selectedLead)}
        disabled={status === 'locating'}
        variant="outline"
      />
      <View style={{ height: spacing.sm }} />
      {pendingCount > 0 ? (
        <PrimaryButton title="Sync hàng đợi ngay" onPress={() => flush()} variant="outline" />
      ) : null}

      {coords !== '—' && <Text style={styles.geo}>Vị trí: {coords}</Text>}
      {message ? <Text style={styles.hint}>{message}</Text> : null}

      {activityLog.length > 0 ? (
        <View style={styles.logBox}>
          <Text style={styles.section}>GPS log gần đây</Text>
          {activityLog.slice(0, 5).map((row) => (
            <View key={row.id} style={styles.logRow}>
              <Text style={styles.logLead}>{row.leadId}</Text>
              <Text style={styles.logMeta}>
                {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)} ·{' '}
                {row.status === 'queued' ? '⏳ Chờ sync' : '✓ Synced'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: brand.background },
  content: { padding: spacing.md, gap: spacing.md },
  greeting: { fontSize: 24, fontWeight: '700', color: brand.primary },
  sub: { fontSize: 14, color: brand.muted, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  apiBox: {
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: brand.border,
  },
  apiLabel: { fontSize: 12, color: brand.muted, fontWeight: '600' },
  apiStatus: { fontSize: 16, color: brand.success, marginTop: 4, fontWeight: '600' },
  apiFail: { color: brand.warning },
  queueHint: { fontSize: 12, color: brand.warning, marginTop: 6, fontWeight: '600' },
  section: { fontSize: 14, fontWeight: '700', color: brand.primaryDark },
  chips: { gap: spacing.sm },
  geo: { fontSize: 12, color: brand.muted, textAlign: 'center' },
  hint: { fontSize: 13, color: brand.primaryDark, textAlign: 'center', lineHeight: 20 },
  logBox: {
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: brand.border,
    gap: spacing.sm,
  },
  logRow: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: brand.border },
  logLead: { fontSize: 13, fontWeight: '700', color: brand.primaryDark },
  logMeta: { fontSize: 11, color: brand.muted, marginTop: 2 },
});
