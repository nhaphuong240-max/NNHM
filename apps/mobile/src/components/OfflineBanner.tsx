import { StyleSheet, Text, View } from 'react-native';
import { brand, spacing } from '../theme/tokens';

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Offline — dữ liệu cache · sync khi có mạng (UC-UX-01)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: brand.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
