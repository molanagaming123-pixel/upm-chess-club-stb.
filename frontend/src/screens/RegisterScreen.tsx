import React, { useState } from 'react';
import { Text } from 'react-native';
import { errorMessage } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { InlineError } from '../components/Feedback';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../navigation/types';
import { font, spacing } from '../theme';
import { hasErrors, validateEmail, validateName, validateNim, validatePassword } from '../utils/validate';

export function RegisterScreen(_: ScreenProps<'Register'>) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    name: validateName(name),
    nim: validateNim(nim),
    email: validateEmail(email),
    password: validatePassword(password),
    confirm: confirm === password ? null : 'Konfirmasi kata sandi tidak sama.',
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : null);

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (hasErrors(errors)) return;
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, nim: nim.trim() || null });
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={[font.muted, { marginBottom: spacing.lg }]}>
        Akun yang didaftarkan di sini otomatis berperan sebagai Anggota. Hak Administrator hanya diberikan oleh pengurus.
      </Text>
      <InlineError message={error} />
      <Field label="Nama lengkap" value={name} onChangeText={setName} autoCapitalize="words" error={show('name')} />
      <Field label="NIM (opsional)" value={nim} onChangeText={setNim} error={show('nim')} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" error={show('email')} />
      <Field
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={show('password')}
        hint="Minimal 8 karakter, mengandung huruf dan angka."
      />
      <Field label="Ulangi kata sandi" value={confirm} onChangeText={setConfirm} secureTextEntry error={show('confirm')} />
      <Button title="Daftar" onPress={submit} loading={loading} />
    </Screen>
  );
}
