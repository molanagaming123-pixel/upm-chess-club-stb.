import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Participant, RegistrationStatus, api, errorMessage } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Badge } from '../components/Chips';
import { InlineError } from '../components/Feedback';
import { MatchRow } from '../components/MatchRow';
import { PlayerPicker } from '../components/PlayerPicker';
import { Async } from '../components/Screen';
import { StandingsTable } from '../components/StandingsTable';
import { useLoad } from '../hooks/useLoad';
import type { ScreenProps } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { confirmAction } from '../utils/confirm';
import { formatDateRange, registrationLabel, tournamentStatusLabel } from '../utils/format';

const STATUS_TONE = { upcoming: 'info', ongoing: 'gold', finished: 'neutral' } as const;
const REG_TONE: Record<RegistrationStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function TournamentDetailScreen({ route, navigation }: ScreenProps<'TournamentDetail'>) {
  const { id } = route.params;
  const { isAdmin, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const state = useLoad(async () => {
    const [tournament, participants, rounds, standings, members] = await Promise.all([
      api.tournament(id),
      api.participants(id),
      api.rounds(id),
      api.tournamentStandings(id),
      isAdmin ? api.members(undefined, 'active') : Promise.resolve([]),
    ]);
    return { tournament, participants, rounds, standings, members };
  }, [id, isAdmin]);

  /** Menjalankan aksi, menampilkan galat dari server, lalu memuat ulang data. */
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await state.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const removeParticipant = async (p: Participant) => {
    const ok = await confirmAction('Keluarkan peserta?', `${p.name} akan dikeluarkan dari turnamen ini.`, 'Keluarkan', true);
    if (ok) await run(() => api.removeParticipant(id, p.user_id));
  };

  return (
    <Async state={state}>
      {({ tournament: t, participants, rounds, standings, members }) => {
        const approved = participants.filter((p) => p.status === 'approved');
        const pending = participants.filter((p) => p.status === 'pending');
        const rejected = participants.filter((p) => p.status === 'rejected');
        const approvedIds = new Set(approved.map((p) => p.user_id));
        const addable = members
          .filter((m) => !approvedIds.has(m.id))
          .map((m) => ({ id: m.id, name: m.name }));
        const canRegister = !isAdmin && t.status === 'upcoming' && t.my_registration === null;

        return (
          <>
            <InlineError message={actionError} />

            <Card>
              <View style={styles.headRow}>
                <Text style={[font.title, { flex: 1 }]}>{t.name}</Text>
                <Badge label={tournamentStatusLabel[t.status]} tone={STATUS_TONE[t.status]} />
              </View>
              <Text style={font.muted}>{formatDateRange(t.start_date, t.end_date)}</Text>
              {t.location ? <Text style={font.muted}>📍 {t.location}</Text> : null}
              {t.description ? <Text style={[font.body, { marginTop: spacing.sm }]}>{t.description}</Text> : null}
              <Text style={[font.muted, { marginTop: spacing.sm }]}>
                {t.participant_count} peserta · {t.match_count} pertandingan
              </Text>
            </Card>

            {t.my_registration ? (
              <Card>
                <View style={styles.headRow}>
                  <Text style={[font.body, { flex: 1 }]}>Status pendaftaran Anda</Text>
                  <Badge label={registrationLabel[t.my_registration]} tone={REG_TONE[t.my_registration]} />
                </View>
              </Card>
            ) : null}
            {canRegister ? (
              <Button
                title="Ajukan pendaftaran"
                onPress={() => run(() => api.registerSelf(id))}
                loading={busy}
                style={{ marginBottom: spacing.md }}
              />
            ) : null}

            {isAdmin ? (
              <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
                <Button title="Ubah turnamen" onPress={() => navigation.navigate('TournamentForm', { id })} variant="secondary" />
              </View>
            ) : null}

            {/* ---------- Peserta ---------- */}
            <SectionTitle title={`Peserta (${approved.length})`} />
            {isAdmin && t.status !== 'finished' ? (
              <PlayerPicker
                label="Tambah peserta"
                value={null}
                options={addable}
                placeholder="Pilih anggota aktif…"
                emptyText="Semua anggota aktif sudah terdaftar."
                disabled={busy}
                onChange={(userId) => void run(() => api.addParticipant(id, userId))}
              />
            ) : null}

            {isAdmin && pending.length > 0 ? (
              <>
                <Text style={[font.muted, { fontWeight: '700', marginBottom: spacing.sm }]}>
                  Menunggu persetujuan ({pending.length})
                </Text>
                {pending.map((p) => (
                  <Card key={p.user_id} style={{ padding: spacing.md }}>
                    <Text style={font.body}>{p.name}</Text>
                    <View style={styles.actions}>
                      <Button small title="Setujui" disabled={busy} onPress={() => run(() => api.setParticipantStatus(id, p.user_id, 'approved'))} />
                      <Button small title="Tolak" variant="danger" disabled={busy} onPress={() => run(() => api.setParticipantStatus(id, p.user_id, 'rejected'))} />
                    </View>
                  </Card>
                ))}
              </>
            ) : null}

            {approved.length === 0 ? (
              <Card><Text style={font.muted}>Belum ada peserta yang disetujui.</Text></Card>
            ) : (
              approved.map((p) => (
                <Card key={p.user_id} style={{ padding: spacing.md }} onPress={() => navigation.navigate('MemberDetail', { id: p.user_id })}>
                  <View style={styles.headRow}>
                    <Text style={[font.body, { flex: 1 }]}>
                      {p.name}
                      {p.user_id === user?.id ? ' (Anda)' : ''}
                    </Text>
                    {isAdmin ? (
                      <Button small variant="danger" title="Keluarkan" disabled={busy} onPress={() => removeParticipant(p)} />
                    ) : null}
                  </View>
                </Card>
              ))
            )}

            {isAdmin && rejected.length > 0 ? (
              <>
                <Text style={[font.muted, { fontWeight: '700', marginVertical: spacing.sm }]}>Ditolak ({rejected.length})</Text>
                {rejected.map((p) => (
                  <Card key={p.user_id} style={{ padding: spacing.md }}>
                    <View style={styles.headRow}>
                      <Text style={[font.muted, { flex: 1 }]}>{p.name}</Text>
                      <Button small variant="ghost" title="Setujui" disabled={busy} onPress={() => run(() => api.setParticipantStatus(id, p.user_id, 'approved'))} />
                    </View>
                  </Card>
                ))}
              </>
            ) : null}

            {/* ---------- Ronde & pertandingan ---------- */}
            <SectionTitle title="Ronde & pertandingan" />
            {isAdmin && t.status !== 'finished' ? (
              <Button
                title="+ Tambah pertandingan"
                variant="secondary"
                onPress={() => navigation.navigate('MatchForm', { tournamentId: id })}
                style={{ marginBottom: spacing.md }}
              />
            ) : null}
            {rounds.length === 0 ? (
              <Card>
                <Text style={font.muted}>
                  Belum ada pertandingan.{isAdmin ? ' Tambahkan peserta lalu susun pairing per ronde.' : ''}
                </Text>
              </Card>
            ) : (
              rounds.map((r) => (
                <View key={r.round}>
                  <Text style={[font.heading, { color: colors.gold, marginVertical: spacing.sm }]}>Ronde {r.round}</Text>
                  {r.matches.map((m) => (
                    <MatchRow
                      key={m.id}
                      match={m}
                      showTournament={false}
                      onPress={isAdmin ? () => navigation.navigate('MatchForm', { matchId: m.id }) : undefined}
                    />
                  ))}
                </View>
              ))
            )}

            {/* ---------- Klasemen ---------- */}
            <SectionTitle title="Klasemen turnamen" />
            {standings.length === 0 ? (
              <Card><Text style={font.muted}>Klasemen muncul setelah ada peserta yang disetujui.</Text></Card>
            ) : (
              <StandingsTable
                rows={standings}
                highlightUserId={user?.id}
                onRowPress={(r) => navigation.navigate('MemberDetail', { id: r.user_id })}
              />
            )}
          </>
        );
      }}
    </Async>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
