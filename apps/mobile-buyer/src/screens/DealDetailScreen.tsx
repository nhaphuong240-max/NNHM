import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { applyBnpl, fetchDeal, type BuyerDeal } from '../api/portal';
import { brand } from '../config';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DealDetail'>;

export function DealDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const [deal, setDeal] = useState<BuyerDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [bnplStatus, setBnplStatus] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setDeal(await fetchDeal(bookingId));
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading || !deal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  const steps = deal.steps ?? [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{deal.unitCode ?? deal.id}</Text>
      <Text style={styles.badge}>Trạng thái: {deal.status}</Text>

      <Text style={styles.section}>Deal timeline</Text>
      {steps.map((step) => (
        <View key={step.id} style={styles.stepRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: step.done
                  ? brand.success
                  : step.active
                    ? brand.primary
                    : brand.border,
              },
            ]}
          />
          <Text style={[styles.step, step.active && styles.stepActive]}>
            {step.label}
            {step.done ? ' ✓' : step.active ? ' · hiện tại' : ''}
          </Text>
        </View>
      ))}

      <Pressable style={styles.btn} onPress={() => navigation.navigate('Bnpl', { bookingId })}>
        <Text style={styles.btnText}>BNPL · chọn gói</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, styles.btnOutline]}
        onPress={async () => {
          const result = await applyBnpl(bookingId);
          setBnplStatus(result.data.status);
        }}
      >
        <Text style={[styles.btnText, styles.btnOutlineText]}>BNPL nhanh (3 kỳ)</Text>
      </Pressable>
      {bnplStatus && <Text style={styles.muted}>BNPL: {bnplStatus}</Text>}

      <Pressable
        style={[styles.btn, styles.btnOutline]}
        onPress={() => navigation.navigate('Esign', { bookingId })}
      >
        <Text style={[styles.btnText, styles.btnOutlineText]}>E-sign in-app</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: brand.primaryDark },
  badge: { marginTop: 8, color: brand.primary, fontWeight: '600' },
  section: { marginTop: 20, fontWeight: '700', color: brand.primaryDark },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  step: { color: brand.muted, flex: 1 },
  stepActive: { color: brand.primaryDark, fontWeight: '600' },
  btn: {
    marginTop: 16,
    backgroundColor: brand.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnOutline: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutlineText: { color: brand.primary },
  muted: { marginTop: 8, color: brand.muted },
});
