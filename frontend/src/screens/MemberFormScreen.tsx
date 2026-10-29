import React, { useEffect, useState } from 'react';
import { api, errorMessage, UserStatus } from '../api';
import { Button } from '../components/Button';
import { ChipRow } from '../components/Chips';
import { Field } from '../components/Field';
import { InlineError, Loading } from '../components/Feedback';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../navigation/types';
import { spacing } from '../theme';
import { Text } from 'react-native';
import { font } from '../theme';
import { hasErrors, validateDate, validateEmail, validateName, validateNim, validatePassword } from '../utils/validate';
import { todayISO } from '../utils/format';

export function MemberFormScreen({ route, navigation }: ScreenProps<'MemberForm'>) {
  const editId = route.params?.id;
  const isEdit = editId !== undefined;
  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinedAt, setJoinedAt] = useState(todayISO());
  const [status, setStatus] = useState<UserStatus>('active');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Ubah Anggota' : 'Tambah Anggota' });
    if (!isEdit) return;
    (async () => {
      try {
        const m = await api.member(editId);
        setName(m.name);
        setNim(m.nim ?? '');
        setEmail(m.email ?? '');
        setJoinedAt(m.joined_at);
        setStatus(m.status);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [editId, isEdit, navigation]);

  const errors = {
    name: validateName(name),
    nim: validateNim(nim),
    email: validateEmail(email),
    // kata sandi wajib saat tambah; saat ubah hanya divalidasi jika diisi
    password: isEdit && !password ? null : validatePassword(password),
    joinedAt: validateDate(joinedAt, 'Tanggal bergabung'),
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : null);

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (hasErrors(errors)) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateMember(editId, {
          name: name.trim(),
          nim: nim.trim() || null,
          email: email.trim(),
          status,
          joined_at: joinedAt.trim(),
          ...(password ? { password } : {}),
        });
      } else {
        await api.createMember({
          name: name.trim(),
          nim: nim.trim() || null,
          email: email.trim(),
          password,
          status,
          joined_at: joinedAt.trim(),
        });
      }
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Screen footer={<Button title={isEdit ? 'Simpan perubahan' : 'Tambah anggota'} onPress={save} loading={saving} />}>
      <InlineError message={error} />
      <Field label="Nama lengkap" value={name} onChangeText={setName} autoCapitalize="words" error={show('name')} />
      <Field label="NIM (opsional)" value={nim} onChangeText={setNim} error={show('nim')} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" error={show('email')} />
      <Field
        label={isEdit ? 'Kata sandi baru (kosongkan jika tidak diubah)' : 'Kata sandi awal'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={show('password')}
        hint="Minimal 8 karakter, mengandung huruf dan angka."
      />
      <Field
        label="Tanggal bergabung (YYYY-MM-DD)"
        value={joinedAt}
        onChangeText={setJoinedAt}
        keyboardType="numbers-and-punctuation"
        error={show('joinedAt')}
      />
      <Text style={[font.muted, { marginBottom: spacing.xs, fontWeight: '600' }]}>Status</Text>
      <ChipRow<UserStatus>
        scroll={false}
        value={status}
        onChange={setStatus}
        options={[
          { value: 'active', label: 'Aktif' },
          { value: 'inactive', label: 'Nonaktif' },
        ]}
      />
    </Screen>
  );
}
