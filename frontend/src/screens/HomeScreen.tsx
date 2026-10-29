import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Card, SectionTitle, StatBox } from '../components/Card';
import { Badge } from '../components/Chips';
import { EmptyState } from '../components/Feedback';
import { MatchRow } from '../components/MatchRow';
import { Async } from '../components/Screen';
import { GradientCard } from '../components/GradientCard';
import { Avatar } from '../components/Avatar';
import { Podium } from '../components/Podium';
import { LogoBadge } from '../components/LogoBadge';
import { useLoad } from '../hooks/useLoad';
import { useNav } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { formatDateRange } from '../utils/format';

export function HomeScreen() {
  const nav = useNav();
  const { user, isAdmin } = useAuth();
  const state = useLoad(() => api.dashboard());

  return (
    <Async state={state}>
      {(d) => {
        const noData = d.total_members === 0 && d.total_matches === 0 && d.upcoming_tournaments.length === 0;
        return (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
              <LogoBadge size={56} />
              <View style={{ flex: 1 }}>
                <Text style={font.title}>Halo, {user?.name}</Text>
                <Text style={font.muted}>
                  {isAdmin ? 'Masuk sebagai Administrator' : 'Masuk sebagai Anggota'}
                </Text>
              </View>
            </View>

            {/* Kartu statistik gradasi */}
            <View style={styles.grid}>
              <GradientCard colors={[colors.blue, colors.bg]} style={styles.stat}>
                <StatBox label="Total anggota" value={d.total_members} />
              </GradientCard>
              <GradientCard colors={[colors.green, colors.blue]} style={styles.stat}>
                <StatBox label="Anggota aktif" value={d.active_members} />
              </GradientCard>
              <GradientCard colors={[colors.gold, colors.amber]} style={styles.stat}>
                <StatBox label="Turnamen berlangsung" value={d.active_tournaments} accent />
              </GradientCard>
              <GradientCard colors={[colors.red, colors.bg]} style={styles.stat}>
                <StatBox label="Total pertandingan" value={d.total_matches} />
              </GradientCard>
            </View>

            {noData ? (
              <Card style={{ marginTop: spacing.lg }}>
                <EmptyState
                  icon="sparkles-outline"
                  title="Belum ada data klub"
                  message={
                    isAdmin
                      ? 'Mulai dengan menambahkan anggota, lalu buat turnamen pertama.'
                      : 'Pengurus belum memasukkan data. Silakan cek kembali nanti.'
                  }
                  actionLabel={isAdmin ? 'Tambah anggota' : undefined}
                  onAction={isAdmin ? () => nav.navigate('MemberForm') : undefined}
                />
              </Card>
            ) : null}

            <SectionTitle title="Turnamen mendatang" action={{ label: 'Semua', onPress: () => nav.navigate('Tabs', { screen: 'Turnamen' }) }} />
            {d.upcoming_tournaments.length === 0 ? (
              <Card>
                <Text style={font.muted}>Belum ada turnamen yang dijadwalkan.</Text>
              </Card>
            ) : (
              d.upcoming_tournaments.map((t) => (
                <Card key={t.id} onPress={() => nav.navigate('TournamentDetail', { id: t.id })}>
                  <View style={styles.tourneyHeader}>
                    <Text style={[font.heading, { flex: 1 }]} numberOfLines={2}>{t.name}</Text>
                    {t.my_registration ? (
                      <Badge
                        label={t.my_registration === 'approved' ? 'Terdaftar' : t.my_registration === 'pending' ? 'Menunggu' : 'Ditolak'}
                        tone={t.my_registration === 'approved' ? 'success' : t.my_registration === 'pending' ? 'warning' : 'danger'}
                      />
                    ) : null}
                  </View>
                  <Text style={[font.muted, { marginTop: 4 }]}>{formatDateRange(t.start_date, t.end_date)}</Text>
                  {t.location ? <Text style={font.muted}>📍 {t.location}</Text> : null}
                  <View style={styles.rowGap}>
                    <Badge label={`${t.participant_count} peserta`} tone="info" />
                    <Badge label={`${t.match_count} pertandingan`} tone="neutral" />
                  </View>
                </Card>
              ))
            )}

            <SectionTitle title="Hasil terbaru" action={{ label: 'Riwayat', onPress: () => nav.navigate('Matches') }} />
            {d.recent_results.length === 0 ? (
              <Card>
                <Text style={font.muted}>Belum ada hasil pertandingan yang dicatat.</Text>
              </Card>
            ) : (
              d.recent_results.map((m) => <MatchRow key={m.id} match={m} onPress={() => nav.navigate('Matches')} />)
            )}

            <SectionTitle title="Peringkat teratas" action={{ label: 'Lengkap', onPress: () => nav.navigate('Tabs', { screen: 'Peringkat' }) }} />
            {d.top_players.length === 0 ? (
              <Card>
                <Text style={font.muted}>Peringkat muncul setelah ada hasil pertandingan.</Text>
              </Card>
            ) : (
              <Podium rows={d.top_players} highlightUserId={user?.id} size="md" />
            )}
          </>
        );
      }}
    </Async>
  );
}

const styles = StyleSheet.create({
  stat: { flexBasis: '47%', flexGrow: 1, marginBottom: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowGap: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  tourneyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

