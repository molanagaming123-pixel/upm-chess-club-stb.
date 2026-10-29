import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card, SectionTitle, StatBox } from '../components/Card';
import { Badge } from '../components/Chips';
import { InlineError } from '../components/Feedback';
import { MatchRow } from '../components/MatchRow';
import { Async } from '../components/Screen';
import { useLoad } from '../hooks/useLoad';
import { ScreenProps } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { confirmAction } from '../utils/confirm';
import { formatDate, userStatusLabel } from '../utils/format';

export function MemberDetailScreen({ route, navigation }: ScreenProps<'MemberDetail'>) {
  const { id } = route.params;
  const { isAdmin, user } = useAuth();
  const state = useLoad(() => api.memberStats(id), [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleStatus = async (current: 'active' | 'inactive') => {
    const next = current === 'active' ? 'inactive' : 'active';
    const ok = await confirmAction(
      next === 'inactive' ? 'Nonaktifkan anggota?' : 'Aktifkan anggota?',
      next === 'inactive'
        ? 'Anggota nonaktif tidak bisa login dan tidak bisa dipasangkan di pertandingan baru. Riwayatnya tetap tersimpan.'
        : 'Anggota akan dapat login dan bertanding lagi.',
      next === 'inactive' ? 'Nonaktifkan' : 'Aktifkan',
      next === 'inactive',
    );
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.updateMember(id, { status: next });
      await state.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirmAction(
      'Hapus anggota?',
      'Tindakan ini permanen. Anggota yang punya riwayat pertandingan tidak dapat dihapus (gunakan Nonaktifkan).',
      'Hapus',
      true,
    );
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.deleteMember(id);
      navigation.goBack();
    } catch (e) {
      setActionError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Async state={state}>
      {(s) => {
        const m = s.member;
        const isSelf = user?.id === m.id;
        return (
          <>
            <InlineError message={actionError} />
            <Card>
              <View style={styles.headRow}>
                <Text style={[font.title, { flex: 1 }]}>{m.name}</Text>
                <Badge label={userStatusLabel[m.status]} tone={m.status === 'active' ? 'success' : 'neutral'} />
              </View>
              <Text style={font.muted}>Bergabung {formatDate(m.joined_at)}</Text>
              {m.email ? <Text style={[font.body, { marginTop: spacing.sm }]}>Email: {m.email}</Text> : null}
              {m.nim ? <Text style={font.body}>NIM: {m.nim}</Text> : null}
            </Card>

            <SectionTitle title="Statistik" />
            <View style={styles.grid}>
              <StatBox label="Peringkat" value={s.rank ? `#${s.rank} / ${s.total_ranked}` : '-'} accent />
              <StatBox label="Total poin" value={s.points} accent />
              <StatBox label="Pertandingan" value={s.played} />
              <StatBox label="Menang" value={s.wins} />
              <StatBox label="Seri" value={s.draws} />
              <StatBox label="Kalah" value={s.losses} />
            </View>
            {s.played === 0 ? <Text style={[font.muted, { marginTop: spacing.sm }]}>Belum ada pertandingan dengan hasil.</Text> : null}

            <SectionTitle title="Perkembangan peringkat" />
            {s.rank_history.length === 0 ? (
              <Card><Text style={font.muted}>Riwayat peringkat muncul setelah pemain bertanding.</Text></Card>
            ) : (
              <Card>
                {s.rank_history.map((h, i) => {
                  const prev = i > 0 ? s.rank_history[i - 1].rank : null;
                  const delta = prev === null ? null : prev - h.rank; // positif = naik
                  return (
                    <View key={h.date} style={styles.histRow}>
                      <Text style={[font.muted, { width: 100 }]}>{formatDate(h.date)}</Text>
                      <Text style={[font.body, { flex: 1 }]}>Peringkat #{h.rank} · {h.points} poin</Text>
                      {delta !== null && delta !== 0 ? (
                        <Text style={{ color: delta > 0 ? colors.success : colors.danger, fontWeight: '700' }}>
                          {delta > 0 ? `▲ ${delta}` : `▼ ${-delta}`}
                        </Text>
                      ) : (
                        <Text style={font.muted}>{delta === 0 ? '–' : ''}</Text>
                      )}
                    </View>
                  );
                })}
                <Text style={[font.muted, { marginTop: spacing.sm }]}>
                  Peringkat dihitung ulang dari hasil pertandingan sampai tanggal tersebut.
                </Text>
              </Card>
            )}

            <SectionTitle title="Riwayat pertandingan" />
            {s.recent_matches.length === 0 ? (
              <Card><Text style={font.muted}>Belum ada pertandingan.</Text></Card>
            ) : (
              s.recent_matches.map((mt) => <MatchRow key={mt.id} match={mt} perspectiveUserId={m.id} />)
            )}

            {isAdmin ? (
              <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
                <Button title="Ubah data anggota" onPress={() => navigation.navigate('MemberForm', { id })} variant="secondary" />
                {!isSelf ? (
                  <>
                    <Button
                      title={m.status === 'active' ? 'Nonaktifkan' : 'Aktifkan kembali'}
                      onPress={() => toggleStatus(m.status)}
                      variant="ghost"
                      loading={busy}
                    />
                    <Button title="Hapus anggota" onPress={remove} variant="danger" disabled={busy} />
                  </>
                ) : null}
              </View>
            ) : null}
          </>
        );
      }}
    </Async>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
});
