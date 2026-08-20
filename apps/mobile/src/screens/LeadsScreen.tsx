import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLeadCaptureSync } from '../hooks/useLeadCaptureSync';
import { useGpsCheckIn } from '../hooks/useGpsCheckIn';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/AppNavigator';
import type { Lead } from '../types/lead';
import { brand, spacing } from '../theme/tokens';

function formatSyncedAt(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
}

function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}

export function LeadsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { offline } = useNetworkStatus();
  const { leads, source, syncedAt, loading, refreshing, error, refresh } = useLeads();
  const { pending, captureLead, syncing } = useLeadCaptureSync();
  const { checkIn, status: gpsStatus } = useGpsCheckIn();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [captureMsg, setCaptureMsg] = useState<string | null>(null);

  async function submitCapture() {
    if (!fullName.trim() || !phone.trim()) return;
    const result = await captureLead({ fullName, phone });
    setCaptureMsg(result.mode === 'queued' ? 'Đã lưu offline — sync khi có mạng' : `Lead tạo: ${result.id}`);
    setFullName('');
    setPhone('');
    if (result.mode === 'live') void refresh();
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Leads · Pipeline</Text>
        <Text style={styles.sub}>UC-CRM-03 · offline capture + cache</Text>
        <View style={styles.metaRow}>
          <View style={[styles.chip, source === 'cache' && styles.chipCache]}>
            <Text style={styles.chipText}>
              {source === 'network' ? '● Live' : source === 'cache' ? '● Cache' : '● Trống'}
            </Text>
          </View>
          {offline && (
            <View style={styles.chipOffline}>
              <Text style={styles.chipOfflineText}>Airplane OK</Text>
            </View>
          )}
        </View>
        <Text style={styles.synced}>Đồng bộ: {formatSyncedAt(syncedAt)}</Text>
        {pending.length > 0 && (
          <Text style={styles.synced}>Chờ sync: {pending.length} lead{syncing ? ' · đang gửi…' : ''}</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.captureBox}>
        <Text style={styles.captureTitle}>Capture lead {offline ? '(offline queue)' : '(live)'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Họ tên"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="SĐT"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Pressable style={styles.captureBtn} onPress={() => void submitCapture()}>
          <Text style={styles.captureBtnText}>Lưu lead</Text>
        </Pressable>
        {captureMsg && <Text style={styles.synced}>{captureMsg}</Text>}
      </View>

      {loading && leads.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={brand.primary} />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={leads.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={brand.primary}
              title={offline ? 'Offline — chỉ đọc cache' : 'Kéo để sync'}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {offline
                ? 'Không có cache. Bật mạng và kéo để tải leads lần đầu.'
                : 'Chưa có lead. Kéo xuống để tải.'}
            </Text>
          }
          renderItem={({ item }) => (
            <LeadRow
              item={item}
              onBook={() =>
                navigation.navigate('Booking', { leadId: item.id, leadName: item.fullName })
              }
              onCheckIn={() => checkIn(item.id)}
              checkingIn={gpsStatus === 'locating'}
            />
          )}
        />
      )}
    </View>
  );
}

function LeadRow({
  item,
  onBook,
  onCheckIn,
  checkingIn,
}: {
  item: Lead;
  onBook: () => void;
  onCheckIn: () => void;
  checkingIn: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.meta}>
          Score {item.score} · {maskPhone(item.phone)}
        </Text>
        <Text style={styles.source}>{item.source}</Text>
        <Pressable style={styles.bookBtn} onPress={onBook}>
          <Text style={styles.bookBtnText}>Giữ chỗ</Text>
        </Pressable>
        <Pressable style={styles.gpsBtn} onPress={onCheckIn} disabled={checkingIn}>
          <Text style={styles.gpsBtnText}>{checkingIn ? 'GPS…' : 'GPS (tuỳ chọn)'}</Text>
        </Pressable>
      </View>
      <View style={[styles.badge, item.tier === 'HOT' && styles.hot]}>
        <Text style={styles.badgeText}>{item.tier}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: brand.background },
  header: { padding: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: brand.primary },
  sub: { fontSize: 13, color: brand.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipCache: { backgroundColor: '#FEF3C7' },
  chipText: { fontSize: 11, fontWeight: '700', color: brand.primaryDark },
  chipOffline: {
    backgroundColor: brand.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipOfflineText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  synced: { fontSize: 11, color: brand.muted, marginTop: spacing.sm },
  captureBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: brand.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.border,
  },
  captureTitle: { fontSize: 13, fontWeight: '700', color: brand.primaryDark, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    backgroundColor: '#fff',
  },
  captureBtn: {
    backgroundColor: brand.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  captureBtnText: { color: '#fff', fontWeight: '700' },
  error: { fontSize: 12, color: brand.destructive, marginTop: spacing.sm },
  loader: { marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  emptyList: { flexGrow: 1, padding: spacing.md, justifyContent: 'center' },
  empty: { textAlign: 'center', color: brand.muted, fontSize: 14, lineHeight: 22 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: brand.border,
    marginBottom: spacing.sm,
  },
  cardBody: { flex: 1, paddingRight: spacing.sm },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: brand.muted, marginTop: 2 },
  source: { fontSize: 11, color: brand.muted, marginTop: 4 },
  bookBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  gpsBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gpsBtnText: { fontSize: 11, fontWeight: '700', color: brand.primary },
  badge: {
    backgroundColor: brand.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hot: { backgroundColor: '#FFEDD5' },
  badgeText: { fontSize: 11, fontWeight: '700', color: brand.primaryDark },
});
