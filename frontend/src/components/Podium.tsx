import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Avatar } from './Avatar';
import { colors, font, radius, spacing } from '../theme';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function Podium({
  rows,
  highlightUserId,
  size = 'md',
  onGold = false,
}: {
  rows: { rank: number; name: string; points: number; user_id?: number }[];
  highlightUserId?: number;
  size?: 'sm' | 'md' | 'lg';
  onGold?: boolean;
}) {
  const dims = { sm: { h: 120, fs: 16 }, md: { h: 150, fs: 18 }, lg: { h: 190, fs: 20 } }[size];
  const top3 = rows.slice(0, 3);

  return (
    <View style={styles.container}>
      {top3.map((r, i) => {
        const place = i + 1;
        const me = r.user_id === highlightUserId;
        const isTop3 = place <= 3;
        return (
          <View
            key={r.user_id ?? place}
            style={[
              styles.column,
              me && styles.me,
              place === 1 && styles.champion,
              place === 2 && styles.runnerUp,
            ]}
          >
            <Text style={styles.medal}>{MEDAL[place as keyof typeof MEDAL]}</Text>
            <Avatar name={r.name} size={dims.fs * 1.6} />
            <View style={styles.rankBadge}>
              <Text style={[font.small, { color: colors.textMuted }]}>#{r.rank}</Text>
            </View>
            <Text
              style={[
                font.heading,
                { fontSize: dims.fs, textAlign: 'center', color: onGold ? colors.onGold : me ? colors.gold : colors.text },
              ]}
              numberOfLines={1}
            >
              {r.name}
            </Text>
            <Text style={[font.muted, { textAlign: 'center', marginTop: 2 }, onGold && { color: colors.onGold, fontWeight: '700' }]}>
              {r.points} poin
            </Text>
          </View>
        );
      })}
      {/* Kolom kosong agar rata jika kurang dari 3 */}
      {top3.length < 3 && (
        <View style={[styles.column, styles.empty]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 6,
    paddingVertical: spacing.md,
  },
  column: {
    alignItems: 'center',
    flex: 1,
  },
  empty: { flex: 1 },
  champion: { paddingBottom: 14 },
  runnerUp: { paddingBottom: 6 },
  medal: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  me: {
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    padding: 4,
    backgroundColor: colors.surface,
  } as ViewStyle,
});
