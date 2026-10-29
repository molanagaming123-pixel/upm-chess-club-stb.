import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card, SectionTitle, StatBox } from '../components/Card';
import { Badge } from '../components/Chips';
import { MatchRow } from '../components/MatchRow';
import { Async } from '../components/Screen';
import { GradientCard } from '../components/GradientCard';
import { Avatar } from '../components/Avatar';
import { useLoad } from '../hooks/useLoad';
import { useNav } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { confirmAction } from '../utils/confirm';
import { formatDate } from '../utils/format';

export function ProfileScreen() {
  const nav = useNav();
  const { user, isAdmin, logout } = useAuth();
  const state = useLoad(() => api.memberStats(user!.id), [user?.id]);
  const [busy, setBusy] = useState(false);

  const doLogout = async () => {
    const ok = await confirmAction('Keluar dari akun?', 'Anda perlu login lagi untuk memakai aplikasi.', 'Keluar', true);
    if (!ok) return;
    setBusy(true);
    await logout();
  };

  return (
    <Async state={state}>
      {(s) => (
        <>
          <Card style={styles.profileCard}>
            <View style={styles.headRow}>
              <Avatar name={user?.name} size={56} />
              <View>
                <Text style={[font.title, { flex: 1 }]}>{user?.name}</Text>
                <Badge label={isAdmin ? 'Administrator' : 'Anggota'} tone={isAdmin ? 'gold' : 'info'} />
              </View>
            </View>
            <Text style={font.body}>{user?.email}</Text>
            {user?.nim ? <Text style={font.muted}>NIM {user.nim}</Text> : null}
            <Text style={font.muted}>Bergabung {formatDate(user?.joined_at)}</Text>
          </Card>

          <SectionTitle title="Statistik saya" />
          <View style={styles.grid}>
            <GradientCard colors={[colors.blue, colors.bg]} style={styles.statGradient}>
              <StatBox label="Peringkat" value={s.rank ? `#${s.rank} / ${s.total_ranked}` : '-'} accent />
            </GradientCard>
            <GradientCard colors={[colors.gold, colors.amber]} style={styles.statGradient}>
              <StatBox label="Total poin" value={s.points} accent />
            </GradientCard>
            <GradientCard colors={[colors.green, colors.blue]} style={styles.statGradient}>
              <StatBox label="Pertandingan" value={s.played} />
            </GradientCard>
            <GradientCard colors={[colors.red, colors.bg]} style={styles.statGradient}>
              <StatBox label="Menang" value={s.wins} />
            </GradientCard>
            <GradientCard colors={[colors.warning, colors.amber]} style={styles.statGradient}>
              <StatBox label="Seri" value={s.draws} />
            </GradientCard>
            <GradientCard colors={[colors.danger, colors.red]} style={styles.statGradient}>
              <StatBox label="Kalah" value={s.losses} />
            </GradientCard>
          </View>
          {s.played === 0 ? (
            <Text style={[font.muted, { marginTop: spacing.sm }]}>Belum ada pertandingan dengan hasil.</Text>
          ) : null}

          <SectionTitle title="Pertandingan terakhir" action={{ label: 'Semua', onPress: () => nav.navigate('Matches') }} />
          {s.recent_matches.length === 0 ? (
            <Card><Text style={font.muted}>Belum ada pertandingan.</Text></Card>
          ) : (
            s.recent_matches.slice(0, 5).map((m) => <MatchRow key={m.id} match={m} perspectiveUserId={s.member.id} />)
          )}

          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            <Button title="Lihat detail & perkembangan peringkat" onPress={() => nav.navigate('MemberDetail', { id: s.member.id })} variant="secondary" />
            <Button title="Tentang aplikasi" onPress={() => nav.navigate('About')} variant="secondary" />
            <Button title="Keluar" onPress={doLogout} variant="danger" loading={busy} />
          </View>
        </>
      )}
    </Async>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 4 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statGradient: { flexGrow: 1, flexBasis: '45%' },
});

