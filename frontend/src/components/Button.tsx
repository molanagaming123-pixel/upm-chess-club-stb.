import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, small, style }: Props) {
  const isDisabled = disabled || loading;
  const v = variants[variant];

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [isDisabled, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: v.bg, borderColor: v.border },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.text, small && styles.smallText, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const variants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.gold, fg: colors.onGold, border: colors.gold },
  secondary: { bg: 'transparent', fg: colors.gold, border: colors.gold },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  ghost: { bg: colors.surfaceAlt, fg: colors.text, border: colors.border },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  text: { fontSize: 16, fontWeight: '700' },
  smallText: { fontSize: 13 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
