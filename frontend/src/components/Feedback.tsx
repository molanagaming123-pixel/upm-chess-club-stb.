import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '../theme';
import { Button } from './Button';

export function Loading({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={[font.muted, { marginTop: spacing.md }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Text style={[font.heading, { marginTop: spacing.md, textAlign: 'center' }]}>Gagal memuat data</Text>
      <Text style={[font.muted, { marginVertical: spacing.sm, textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <Button title="Coba lagi" onPress={onRetry} variant="secondary" small /> : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon = 'albums-outline',
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={[font.heading, { marginTop: spacing.sm, textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[font.muted, { marginTop: 4, textAlign: 'center' }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" small style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.inline} accessibilityRole="alert">
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 240 },
  empty: { alignItems: 'center', padding: spacing.xl },
  inline: {
    backgroundColor: 'rgba(229,100,95,0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  inlineText: { color: colors.danger, fontSize: 14 },
});
