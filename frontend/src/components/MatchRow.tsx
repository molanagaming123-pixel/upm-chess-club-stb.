import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Match } from '../api';
import { colors, font, spacing } from '../theme';
import { formatDate, outcomeFor, resultScore } from '../utils/format';
import { Card } from './Card';

const OUTCOME_COLOR = { M: colors.success, S: colors.warning, K: colors.danger } as const;
const OUTCOME_LABEL = { M: 'Menang', S: 'Seri', K: 'Kalah' } as const;

export function MatchRow({
  match,
  onPress,
  perspectiveUserId,
  showTournament = true,
}: {
  match: Match;
  onPress?: () => void;
  /** Bila diisi, ditampilkan hasil (Menang/Seri/Kalah) dari sudut pandang pemain ini. */
  perspectiveUserId?: number;
  showTournament?: boolean;
}) {
  const outcome = perspectiveUserId ? outcomeFor(match, perspectiveUserId) : null;
  const meta = [
    formatDate(match.match_date),
    match.kind === 'persahabatan' ? 'Persahabatan' : match.round ? `Ronde ${match.round}` : 'Turnamen',
    showTournament && match.tournament_name ? match.tournament_name : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card onPress={onPress} style={{ padding: spacing.md }}>
      <View style={styles.line}>
        <Text style={[styles.name, { textAlign: 'right' }]} numberOfLines={1}>
          ♔ {match.white_name}
        </Text>
        <Text style={styles.score}>{resultScore(match.result)}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {match.black_name} ♚
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={[font.muted, { flex: 1 }]} numberOfLines={2}>
          {meta}
        </Text>
        {outcome ? (
          <Text style={{ color: OUTCOME_COLOR[outcome], fontWeight: '700', fontSize: 13 }}>{OUTCOME_LABEL[outcome]}</Text>
        ) : match.result === null ? (
          <Text style={{ color: colors.info, fontSize: 12, fontWeight: '600' }}>Terjadwal</Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  score: { color: colors.gold, fontWeight: '800', fontSize: 15, minWidth: 54, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
});
