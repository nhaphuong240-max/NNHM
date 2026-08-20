import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { applyBnpl } from '../api/portal';
import { brand } from '../config';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Bnpl'>;

export function BnplScreen({ route }: Props) {
  const { bookingId } = route.params;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>BNPL · UC-PAY-07</Text>
      <Text style={styles.muted}>Booking {bookingId}</Text>
      <Pressable
        style={styles.btn}
        disabled={loading}
        onPress={async () => {
          setLoading(true);
          try {
            const res = await applyBnpl(bookingId, 'bnpl_3');
            setResult(`${res.data.status} · id=${res.data.id}`);
          } catch (e) {
            setResult(e instanceof Error ? e.message : 'Apply failed');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Gửi hồ sơ 3 kỳ</Text>
        )}
      </Pressable>
      {result && <Text style={styles.result}>{result}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: brand.primaryDark },
  muted: { color: brand.muted, marginTop: 4 },
  btn: {
    marginTop: 20,
    backgroundColor: brand.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  result: { marginTop: 12, color: brand.success },
});
