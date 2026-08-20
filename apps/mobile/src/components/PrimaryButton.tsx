import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { brand, spacing } from '../theme/tokens';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[
        styles.btn,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? brand.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  outlineText: {
    color: brand.primary,
  },
});
