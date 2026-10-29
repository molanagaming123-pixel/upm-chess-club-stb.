import React, { useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RegistrationStatus, Tournament, TournamentStatus, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge, ChipRow } from '../components/Chips';
import { EmptyState } from '../components/Feedback';
import { Async } from '../components/Screen';
import { useLoad } from '../hooks/useLoad';
import { useNav } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { formatDateRange, tournamentStatusLabel } from '../utils/format';

const STATUS_TONE: Record<TournamentStatus, 'info' | 'gold' | 'neutral'> = {
  upcoming: 'info',
  ongoing: 'gold',
  finished: 'neutral',
};
const REG_TONE: Record<RegistrationStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};
const REG_LABEL: Record<RegistrationStatus, string> = {
  pending: 'Menunggu',
  approved: 'Terdaftar',
  rejected: 'Ditolak',
};

export function TournamentsScreen() {
  const nav = useNav();
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<TournamentStatus | null>(null);
  const state = useLoad(() => api.tournaments(status ?? undefined), [status]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <ChipRow<TournamentStatus | null>
          value={status}
          onChange={setStatus}
          options={[
            { value: null, label: 'Semua' },
            { value: 'upcoming', label: 'Mendatang' },
            { value: 'ongoing', label: 'Berlangsung' },
            { value: 'finished', label: 'Selesai' },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Async
          state={state}
          footer={isAdmin ? <Button title="+ Buat turnamen" onPress={() => nav.navigate('TournamentForm')} /> : undefined}
        >
          {(list) =>
            list.length === 0 ? (
              <Card>
                <EmptyState
                  icon="trophy-outline"
                  title={status ? 'Tidak ada turnamen dengan status ini' : 'Belum ada turnamen'}
                  message={isAdmin ? 'Buat turnamen pertama untuk mulai mengelola peserta dan pertandingan.' : 'Pengurus belum membuat turnamen.'}
                />
              </Card>
            ) : (
              list.map((t) => <TournamentCard key={t.id} t={t} onPress={() => nav.navigate('TournamentDetail', { id: t.id })} />)
            )
          }
        </Async>
      </View>
    </SafeAreaView>
  );
}

function TournamentCard({ t, onPress }: { t: Tournament; onPress: () => void }) {
  const isOngoing = t.status === 'ongoing';
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[font.heading, { flex: 1 }]} numberOfLines={2}>{t.name}</Text>
        <Badge label={tournamentStatusLabel[t.status]} tone={STATUS_TONE[t.status]} />
      </View>
      <View style={styles.metaRow}>
        <Text style={[font.muted, { flex: 1 }]}>{formatDateRange(t.start_date, t.end_date)}</Text>
        {t.location ? (
          <Text style={[font.muted, { marginLeft: spacing.sm }]}>📍 {t.location}</Text>
        ) : null}
      </View>
      <View style={styles.statsRow}>
        <Badge label={`${t.participant_count} peserta`} tone="info" />
        <Badge label={`${t.match_count} pertandingan`} tone="neutral" />
        {t.my_registration ? (
          <Badge label={REG_LABEL[t.my_registration]} tone={REG_TONE[t.my_registration]} />
        ) : null}
      </View>
      {isOngoing ? (
        <View style={styles.liveDot} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
    marginLeft: spacing.sm,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  } as ViewStyle,
});

