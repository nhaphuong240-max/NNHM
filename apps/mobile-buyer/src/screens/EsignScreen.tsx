import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { fetchSignSession } from '../api/portal';
import { brand } from '../config';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Esign'>;

export function EsignScreen({ route }: Props) {
  const { bookingId } = route.params;
  const [session, setSession] = useState<{ signingUrl: string; otpHint?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchSignSession(bookingId);
        setSession({ signingUrl: data.signingUrl, otpHint: data.otpHint });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không mở phiên ký');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  if (error || !session) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Không có phiên ký'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {session.otpHint && (
        <Text style={styles.hint}>OTP demo: {session.otpHint}</Text>
      )}
      <WebView source={{ uri: session.signingUrl }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  webview: { flex: 1 },
  hint: { padding: 12, backgroundColor: brand.surface, color: brand.muted, fontSize: 12 },
  error: { color: brand.destructive ?? '#dc2626' },
});
