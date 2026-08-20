import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { PrimaryButton } from '../components/PrimaryButton';
import { createBooking, fetchAvailableUnit, fetchLeads } from '../services/api';
import { BookingConflictError } from '../types/booking';
import type { AvailableUnit, Booking } from '../types/booking';
import type { RootTabParamList } from '../navigation/AppNavigator';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { brand, spacing } from '../theme/tokens';

type BookingRoute = BottomTabScreenProps<RootTabParamList, 'Booking'>['route'];

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} ₫`;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
}

function newIdempotencyKey() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BookingScreen() {
  const route = useRoute<BookingRoute>();
  const { offline } = useNetworkStatus();
  const [submitting, setSubmitting] = useState(false);
  const [loadingUnit, setLoadingUnit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [unit, setUnit] = useState<AvailableUnit | null>(null);
  const [lead, setLead] = useState<{ id: string; name: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const startedAtRef = useRef(Date.now());
  const bookedRef = useRef(false);

  const load = useCallback(async () => {
    setLoadingUnit(true);
    setError(null);
    try {
      const available = await fetchAvailableUnit();
      setUnit(available);
      if (!available) {
        setError('Hết căn AVAILABLE trên tenant này.');
      }

      const paramId = route.params?.leadId;
      const paramName = route.params?.leadName;
      if (paramId) {
        setLead({ id: paramId, name: paramName ?? paramId });
        return;
      }
      const leads = await fetchLeads();
      const first = leads[0];
      setLead(first ? { id: first.id, name: first.fullName } : null);
      if (!first) {
        setError('Chưa có lead. Mở tab Leads, lưu lead, rồi Giữ chỗ.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được căn AVAILABLE');
    } finally {
      setLoadingUnit(false);
    }
  }, [route.params?.leadId, route.params?.leadName]);

  useFocusEffect(
    useCallback(() => {
      startedAtRef.current = Date.now();
      bookedRef.current = false;
      setElapsed(0);
      setBooking(null);
      idempotencyKeyRef.current = newIdempotencyKey();
      const timer = setInterval(() => {
        if (bookedRef.current) return;
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      void load();
      return () => clearInterval(timer);
    }, [load]),
  );

  const payload = useMemo(() => {
    if (!unit || !lead) return null;
    return {
      unitId: unit.id,
      expectedUnitVersion: unit.version,
      leadId: lead.id,
      expiryHours: 48,
      depositAmount: 50_000_000,
      notes: 'OPS-S3-03 book 30s từ lead',
    };
  }, [unit, lead]);

  const submit = useCallback(async () => {
    if (offline) {
      setError('Cần mạng để tạo booking. Giữ chỗ yêu cầu lock atomic trên server.');
      return;
    }
    if (!payload) {
      setError('Thiếu lead hoặc căn AVAILABLE.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createBooking(payload, idempotencyKeyRef.current);
      bookedRef.current = true;
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      setBooking(created);
    } catch (e) {
      if (e instanceof BookingConflictError) {
        const detail = e.existingBookingId
          ? `${e.message} (booking ${e.existingBookingId})`
          : e.message;
        setError(detail);
      } else {
        setError(e instanceof Error ? e.message : 'Không tạo được booking');
      }
    } finally {
      setSubmitting(false);
    }
  }, [offline, payload]);

  const reset = () => {
    setBooking(null);
    setError(null);
    bookedRef.current = false;
    idempotencyKeyRef.current = newIdempotencyKey();
    startedAtRef.current = Date.now();
    setElapsed(0);
  };

  const under30 = elapsed <= 30;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Giữ chỗ 30 giây</Text>
      <Text style={styles.sub}>OPS-S3-03 · lead → xác nhận · không GPS / capture</Text>
      <Text style={[styles.timer, !under30 && styles.timerOver]}>
        {elapsed}s {under30 ? '· mục tiêu ≤30s' : '· quá 30s'}
      </Text>

      {unit ? (
        <View style={styles.card}>
          <Text style={styles.unit}>
            {unit.code} · {unit.bedrooms}PN · {unit.area}m²
          </Text>
          <Text style={styles.price}>{formatMoney(unit.basePrice)}</Text>
          <Text style={styles.meta}>
            {unit.id} · GR v{unit.version}
          </Text>
          <Text style={styles.status}>● {unit.status}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.meta}>{loadingUnit ? 'Đang lấy căn AVAILABLE…' : 'Chưa có căn'}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Lead</Text>
        <Text style={styles.leadName}>{lead?.name ?? '—'}</Text>
        <Text style={styles.meta}>{lead?.id ?? 'Chọn lead từ tab Leads'}</Text>
        <Text style={styles.sectionLabel}>Deposit</Text>
        <Text style={styles.deposit}>{formatMoney(50_000_000)}</Text>
        <Text style={styles.meta}>Hết hạn giữ chỗ: 48h</Text>
      </View>

      {offline && (
        <View style={styles.offlineBox}>
          <Text style={styles.offlineText}>Offline — booking cần kết nối API</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {booking ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>✓ Booking RESERVED</Text>
          <Text style={styles.successLine}>Mã: {booking.id}</Text>
          <Text style={styles.successLine}>Lock: {booking.lockId}</Text>
          <Text style={styles.successLine}>Hết hạn: {formatDateTime(booking.expiresAt)}</Text>
          <Text style={styles.successLine}>Thời gian màn hình: {elapsed}s</Text>
          <PrimaryButton title="Tạo booking mới" onPress={reset} variant="outline" />
        </View>
      ) : (
        <PrimaryButton
          title={submitting ? 'Đang giữ chỗ…' : 'Xác nhận giữ chỗ'}
          onPress={submit}
          disabled={submitting || offline || loadingUnit || !payload}
          loading={submitting}
        />
      )}

      <Text style={styles.hint}>
        Một bước xác nhận. GPS check-in và capture lead nằm ở tab Leads, không chặn book.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: brand.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 22, fontWeight: '700', color: brand.primary },
  sub: { fontSize: 13, color: brand.muted, marginBottom: spacing.sm },
  timer: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.success,
    marginBottom: spacing.lg,
  },
  timerOver: { color: brand.destructive },
  card: {
    backgroundColor: brand.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: brand.border,
    marginBottom: spacing.md,
  },
  unit: { fontSize: 18, fontWeight: '600' },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: brand.primary,
    marginVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  meta: { fontSize: 12, color: brand.muted, marginTop: 2 },
  status: { fontSize: 14, color: brand.success, fontWeight: '600', marginTop: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: brand.muted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  leadName: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  deposit: { fontSize: 18, fontWeight: '700', color: brand.primaryDark, marginTop: 4 },
  offlineBox: {
    backgroundColor: brand.warning,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  error: { fontSize: 13, color: brand.destructive, marginBottom: spacing.sm, lineHeight: 20 },
  successBox: {
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  successTitle: { fontSize: 16, fontWeight: '700', color: brand.primaryDark },
  successLine: { fontSize: 13, color: '#14532d' },
  hint: { fontSize: 12, color: brand.muted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});

