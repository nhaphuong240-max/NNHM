import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchDeals, type BuyerDeal } from '../api/portal';
import { brand } from '../config';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Deals'>;

export function DealsScreen({ navigation }: Props) {
  const [deals, setDeals] = useState<BuyerDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setDeals(await fetchDeals());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải deals');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Deal tracker · UC-UX-02</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.muted}>Chưa có deal</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('DealDetail', { bookingId: item.id })}
          >
            <Text style={styles.cardTitle}>{item.unitCode ?? item.id}</Text>
            <Text style={styles.muted}>{item.status}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: brand.primaryDark, marginBottom: 12 },
  error: { color: brand.destructive, marginBottom: 8 },
  muted: { color: brand.muted },
  card: {
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: brand.border,
  },
  cardTitle: { fontWeight: '600', color: brand.primaryDark },
});
