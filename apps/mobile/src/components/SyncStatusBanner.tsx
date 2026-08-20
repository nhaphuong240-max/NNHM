import { StyleSheet, Text, View } from 'react-native';
import { brand, spacing } from '../theme/tokens';

export function SyncStatusBanner({
  pendingCount,
  syncing,
  lastError,
}: {
  pendingCount: number;
  syncing: boolean;
  lastError: string | null;
}) {
  if (pendingCount === 0 && !lastError) return null;

  return (
    <View style={[styles.banner, lastError ? styles.error : styles.pending]}>
      <Text style={styles.text}>
        {syncing
          ? 'Đang đồng bộ hàng đợi offline…'
          : lastError
            ? `Sync lỗi: ${lastError}`
            : `${pendingCount} hoạt động chờ sync (GPS check-in)`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pending: { backgroundColor: '#FEF3C7' },
  error: { backgroundColor: '#FEE2E2' },
  text: { fontSize: 12, fontWeight: '600', color: brand.primaryDark, textAlign: 'center' },
});
