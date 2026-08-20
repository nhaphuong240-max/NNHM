import { StyleSheet, Text, View } from 'react-native';
import { brand, spacing } from '../theme/tokens';

type Props = { label: string; value: string | number; highlight?: boolean };

export function StatCard({ label, value, highlight }: Props) {
  return (
    <View style={[styles.card, highlight && styles.highlight]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: brand.border,
    flex: 1,
    minWidth: '45%',
  },
  highlight: {
    borderColor: brand.accent,
    borderWidth: 2,
  },
  label: {
    fontSize: 12,
    color: brand.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: brand.primary,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
});
