import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Participant, ResultType, Tournament, api, errorMessage } from '../api';
import { Button } from '../components/Button';
import { ChipRow } from '../components/Chips';
import { Field } from '../components/Field';
import { InlineError, Loading } from '../components/Feedback';
import { PickerOption, PlayerPicker } from '../components/PlayerPicker';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../navigation/types';
import { colors, font, spacing } from '../theme';
import { confirmAction } from '../utils/confirm';
import { formatDateRange, resultOptions, todayISO } from '../utils/format';
import { hasErrors, validateDate } from '../utils/validate';

/**
 * Form pertandingan:
 *  - dari halaman turnamen  -> pertandingan turnamen (pemain = peserta yang disetujui, wajib ronde)
 *  - dari Riwayat tanpa param -> pertandingan persahabatan (pemain = anggota aktif)
 *  - dengan matchId           -> ubah hasil / jadwal / hapus
 */
export function MatchFormScreen({ route, navigation }: ScreenProps<'MatchForm'>) {
  const matchId = route.params?.matchId;
  const isEdit = matchId !== undefined;
  const [tournamentId, setTournamentId] = useState<number | null>(route.params?.tournamentId ?? null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [whiteId, setWhiteId] = useState<number | null>(null);
  const [blackId, setBlackId] = useState<number | null>(null);
  const [round, setRound] = useState('1');
  const [date, setDate] = useState(todayISO());
  const [result, setResult] = useState<ResultType | null>(null);
  const [hadResult, setHadResult] = useState(false);
  const [unpaired, setUnpaired] = useState<Participant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTournament = tournamentId !== null;

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Ubah Pertandingan' : isTournament ? 'Tambah Pertandingan' : 'Pertandingan Persahabatan',
    });
  }, [isEdit, isTournament, navigation]);

  useEffect(() => {
    (async () => {
      try {
        let tid = tournamentId;
        let existing = null;
        if (isEdit) {
          existing = await api.match(matchId);
          tid = existing.tournament_id;
          setTournamentId(tid);
          setWhiteId(existing.white_id);
          setBlackId(existing.black_id);
          setRound(existing.round ? String(existing.round) : '1');
          setDate(existing.match_date);
          setResult(existing.result);
          setHadResult(existing.result !== null);
        }

        let opts: PickerOption[];
        if (tid !== null) {
          const [t, parts, rounds] = await Promise.all([api.tournament(tid), api.participants(tid), api.rounds(tid)]);
          setTournament(t);
          opts = parts.filter((p) => p.status === 'approved').map((p) => ({ id: p.user_id, name: p.name }));
          if (!isEdit) {
            setRound(String(rounds.length ? rounds[rounds.length - 1].round : 1));
            // tanggal bawaan: hari ini, dijepit ke dalam rentang turnamen
            const today = todayISO();
            setDate(today < t.start_date ? t.start_date : today > t.end_date ? t.end_date : today);
          }
        } else {
          const members = await api.members(undefined, 'active');
          opts = members.map((m) => ({ id: m.id, name: m.name }));
        }
        // pemain yang sudah tercatat tetap tampil walau kini nonaktif
        if (existing) {
          for (const [id, name] of [
            [existing.white_id, existing.white_name],
            [existing.black_id, existing.black_name],
          ] as const) {
            if (!opts.some((o) => o.id === id)) opts.push({ id, name });
          }
        }
        opts.sort((a, b) => a.name.localeCompare(b.name));
        setOptions(opts);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const roundNo = parseInt(round, 10);
  const roundValid = /^\d+$/.test(round.trim()) && roundNo >= 1 && roundNo <= 100;

  // Bantuan pairing: siapa yang belum punya lawan di ronde ini (hanya saat membuat).
  useEffect(() => {
    if (isEdit || tournamentId === null || !roundValid) {
      setUnpaired(null);
      return;
    }
    let cancelled = false;
    api
      .unpaired(tournamentId, roundNo)
      .then((u) => !cancelled && setUnpaired(u))
      .catch(() => !cancelled && setUnpaired(null));
    return () => {
      cancelled = true;
    };
  }, [isEdit, tournamentId, roundNo, roundValid]);

  const errors = useMemo(
    () => ({
      white: whiteId === null ? 'Pilih pemain Putih.' : null,
      black:
        blackId === null ? 'Pilih pemain Hitam.' : blackId === whiteId ? 'Pemain tidak dapat melawan dirinya sendiri.' : null,
      round: isTournament && !roundValid ? 'Ronde harus angka 1–100.' : null,
      date: validateDate(date, 'Tanggal pertandingan'),
    }),
    [whiteId, blackId, isTournament, roundValid, date],
  );
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : null);

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (hasErrors(errors)) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateMatch(matchId, {
          white_id: whiteId!,
          black_id: blackId!,
          match_date: date.trim(),
          ...(isTournament ? { round: roundNo } : {}),
          ...(result ? { result } : hadResult ? { clear_result: true } : {}),
        });
      } else {
        await api.createMatch({
          tournament_id: tournamentId,
          round: isTournament ? roundNo : null,
          white_id: whiteId!,
          black_id: blackId!,
          match_date: date.trim(),
          result,
        });
      }
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    const ok = await confirmAction(
      'Hapus pertandingan?',
      'Statistik dan peringkat akan dihitung ulang tanpa pertandingan ini.',
      'Hapus',
      true,
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteMatch(matchId);
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const noPlayers = options.length < 2;

  return (
    <Screen
      footer={
        <Button
          title={isEdit ? 'Simpan perubahan' : 'Simpan pertandingan'}
          onPress={save}
          loading={saving}
          disabled={noPlayers && !isEdit}
        />
      }
    >
      <InlineError message={error} />
      {tournament ? (
        <Text style={[font.muted, { marginBottom: spacing.lg }]}>
          {tournament.name} · {formatDateRange(tournament.start_date, tournament.end_date)}
        </Text>
      ) : (
        <Text style={[font.muted, { marginBottom: spacing.lg }]}>Pertandingan di luar turnamen (persahabatan).</Text>
      )}
      {noPlayers && !isEdit ? (
        <InlineError
          message={
            isTournament
              ? 'Turnamen ini belum punya cukup peserta yang disetujui (minimal 2). Tambahkan peserta dulu.'
              : 'Dibutuhkan minimal 2 anggota aktif.'
          }
        />
      ) : null}

      {isTournament ? (
        <>
          <Field
            label="Ronde"
            value={round}
            onChangeText={setRound}
            keyboardType="number-pad"
            error={show('round')}
          />
          {unpaired ? (
            <Text style={[font.muted, { marginTop: -spacing.sm, marginBottom: spacing.lg }]}>
              {unpaired.length === 0
                ? `Semua peserta sudah punya lawan di ronde ${roundNo}.`
                : `Belum punya lawan di ronde ${roundNo}: ${unpaired.map((u) => u.name).join(', ')}`}
            </Text>
          ) : null}
        </>
      ) : null}

      <PlayerPicker label="Putih ♔" value={whiteId} options={options} onChange={setWhiteId} />
      {show('white') ? <Text style={{ color: colors.danger, marginTop: -spacing.md, marginBottom: spacing.lg }}>{show('white')}</Text> : null}
      <PlayerPicker label="Hitam ♚" value={blackId} options={options} onChange={setBlackId} />
      {show('black') ? <Text style={{ color: colors.danger, marginTop: -spacing.md, marginBottom: spacing.lg }}>{show('black')}</Text> : null}

      <Field
        label="Tanggal pertandingan (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        error={show('date')}
      />

      <Text style={[font.muted, { marginBottom: spacing.xs, fontWeight: '600' }]}>Hasil</Text>
      <ChipRow<ResultType | null> scroll={false} value={result} onChange={setResult} options={resultOptions} />

      {isEdit ? (
        <View style={{ marginTop: spacing.xl }}>
          <Button title="Hapus pertandingan" onPress={remove} variant="danger" disabled={saving} />
        </View>
      ) : null}
    </Screen>
  );
}
