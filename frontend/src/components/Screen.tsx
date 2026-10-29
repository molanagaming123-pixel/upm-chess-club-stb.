import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import type { LoadState } from '../hooks/useLoad';
import { ErrorState, InlineError, Loading } from './Feedback';

interface ScreenProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Tombol/aksi tetap di bagian bawah layar (mis. tombol Simpan). */
  footer?: React.ReactNode;
}

export function Screen({ children, refreshing, onRefresh, footer }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Menampilkan state loading / error / data untuk hasil useLoad. */
export function Async<T>({
  state,
  children,
  footer,
}: {
  state: LoadState<T>;
  children: (data: T) => React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (state.data === null) {
    if (state.loading) return <Centered><Loading /></Centered>;
    return (
      <Centered>
        <ErrorState message={state.error ?? 'Data tidak tersedia.'} onRetry={() => void state.reload()} />
      </Centered>
    );
  }
  return (
    <Screen refreshing={state.refreshing} onRefresh={state.refresh} footer={footer}>
      <InlineError message={state.error} />
      {children(state.data)}
    </Screen>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={[styles.safe, { justifyContent: 'center' }]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
