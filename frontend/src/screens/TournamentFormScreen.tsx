import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { TournamentStatus, api, errorMessage } from '../api';
import { Button } from '../components/Button';
import { ChipRow } from '../components/Chips';
import { Field } from '../components/Field';
import { InlineError, Loading } from '../components/Feedback';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../navigation/types';
import { font, spacing } from '../theme';
import { confirmAction } from '../utils/confirm';
import { todayISO } from '../utils/format';
import { hasErrors, validateDate } from '../utils/validate';

export function TournamentFormScreen({ route, navigation }: ScreenProps<'TournamentForm'>) {
  const editId = route.params?.id;
  const isEdit = editId !== undefined;
  const [name, setName] = useState('');
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TournamentStatus>('upcoming');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Ubah Turnamen' : 'Buat Turnamen' });
    if (!isEdit) return;
    (async () => {
      try {
        const t = await api.tournament(editId);
        setName(t.name);
        setStart(t.start_date);
        setEnd(t.end_date);
        setLocation(t.location ?? '');
        setDescription(t.description ?? '');
        setStatus(t.status);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [editId, isEdit, navigation]);

  const errors = {
    name: name.trim().length >= 3 ? null : 'Nama turnamen minimal 3 karakter.',
    start: validateDate(start, 'Tanggal mulai'),
    end: validateDate(end, 'Tanggal selesai'),
    range: !validateDate(start) && !validateDate(end) && end.trim() < start.trim() ? 'Tanggal selesai tidak boleh sebelum tanggal mulai.' : null,
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : null);

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (hasErrors(errors)) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      start_date: start.trim(),
      end_date: end.trim(),
      location: location.trim() || null,
      description: description.trim() || null,
      status,
    };
    try {
      if (isEdit) await api.updateTournament(editId, payload);
      else await api.createTournament(payload);
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isEdit) return;
    const ok = await confirmAction(
      'Hapus turnamen?',
      'Turnamen yang sudah punya pertandingan tidak dapat dihapus. Tindakan ini permanen.',
      'Hapus',
      true,
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteTournament(editId);
      navigation.popToTop();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Screen footer={<Button title={isEdit ? 'Simpan perubahan' : 'Buat turnamen'} onPress={save} loading={saving} />}>
      <InlineError message={error} />
      <Field label="Nama turnamen" value={name} onChangeText={setName} autoCapitalize="words" error={show('name')} />
      <Field
        label="Tanggal mulai (YYYY-MM-DD)"
        value={start}
        onChangeText={setStart}
        keyboardType="numbers-and-punctuation"
        error={show('start')}
      />
      <Field
        label="Tanggal selesai (YYYY-MM-DD)"
        value={end}
        onChangeText={setEnd}
        keyboardType="numbers-and-punctuation"
        error={show('end') ?? show('range')}
      />
      <Field label="Lokasi (opsional)" value={location} onChangeText={setLocation} autoCapitalize="sentences" />
      <Field
        label="Deskripsi (opsional)"
        value={description}
        onChangeText={setDescription}
        multiline
        autoCapitalize="sentences"
        autoCorrect
      />
      <Text style={[font.muted, { marginBottom: spacing.xs, fontWeight: '600' }]}>Status</Text>
      <ChipRow<TournamentStatus>
        scroll={false}
        value={status}
        onChange={setStatus}
        options={[
          { value: 'upcoming', label: 'Mendatang' },
          { value: 'ongoing', label: 'Berlangsung' },
          { value: 'finished', label: 'Selesai' },
        ]}
      />
      {isEdit ? (
        <View style={{ marginTop: spacing.xl }}>
          <Button title="Hapus turnamen" onPress={remove} variant="danger" disabled={saving} />
        </View>
      ) : null}
    </Screen>
  );
}
