import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StandingRow } from '../api';
import { colors, font, radius, spacing } from '../theme';

export function StandingsTable({
  rows,
  onRowPress,
  highlightUserId,
}: {
  rows: StandingRow[];
  onRowPress?: (row: StandingRow) => void;
  highlightUserId?: number;
}) {
  return (
    <View>
      <View style={[styles.row, styles.head]}>
        <Text style={[styles.cell, styles.rank, styles.headText]}>#</Text>
        <Text style={[styles.cell, styles.name, styles.headText]}>Pemain</Text>
        <Text style={[styles.cell, styles.num, styles.headText]}>Main</Text>
        <Text style={[styles.cell, styles.num, styles.headText]}>M</Text>
        <Text style={[styles.cell, styles.num, styles.headText]}>S</Text>
        <Text style={[styles.cell, styles.num, styles.headText]}>K</Text>
        <Text style={[styles.cell, styles.pts, styles.headText]}>Poin</Text>
      </View>
      {rows.map((r) => {
        const me = r.user_id === highlightUserId;
        return (
          <Pressable
            key={r.user_id}
            accessibilityRole={onRowPress ? 'button' : undefined}
            onPress={onRowPress ? () => onRowPress(r) : undefined}
            style={[styles.row, me && styles.me]}
          >
            <Text style={[styles.cell, styles.rank, r.rank <= 3 && r.played > 0 && { color: colors.gold }]}>{r.rank}</Text>
            <Text style={[styles.cell, styles.name, me && { fontWeight: '800' }]} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={[styles.cell, styles.num]}>{r.played}</Text>
            <Text style={[styles.cell, styles.num]}>{r.wins}</Text>
            <Text style={[styles.cell, styles.num]}>{r.draws}</Text>
            <Text style={[styles.cell, styles.num]}>{r.losses}</Text>
            <Text style={[styles.cell, styles.pts, { color: colors.gold, fontWeight: '800' }]}>{r.points}</Text>
          </Pressable>
        );
      })}
      <Text style={[font.muted, { marginTop: spacing.md }]}>
        M = Menang (3 poin), S = Seri (1 poin), K = Kalah (0 poin). Jika poin sama: menang terbanyak, lalu pertandingan
        paling sedikit, lalu nama A–Z.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  head: { backgroundColor: colors.surfaceAlt, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  me: { backgroundColor: 'rgba(212,175,55,0.12)' },
  cell: { color: colors.text, fontSize: 14 },
  headText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  rank: { width: 28, textAlign: 'center', fontWeight: '700' },
  name: { flex: 1, paddingHorizontal: spacing.xs },
  num: { width: 34, textAlign: 'center' },
  pts: { width: 44, textAlign: 'center' },
});
