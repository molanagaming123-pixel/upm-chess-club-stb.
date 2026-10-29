import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Animated, Easing } from 'react-native';
import { errorMessage } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { InlineError } from '../components/Feedback';
import { Screen } from '../components/Screen';
import { ChessboardBg } from '../components/ChessboardBg';
import { LogoBadge } from '../components/LogoBadge';
import { API_URL } from '../config';
import type { ScreenProps } from '../navigation/types';
import { colors, font, spacing } from '../theme';

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useState(new Animated.Value(0))[0];
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ChessboardBg size={42} />
      <Animated.View style={[styles.brandWrapper, { opacity: fadeAnim }]}>
        <LogoBadge size={120} />
        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
          UPM Chess Club
        </Animated.Text>
        <Animated.Text style={[font.muted, styles.subtitle, { opacity: fadeAnim }]}>
          Universitas Satya Terra Bhinneka
        </Animated.Text>
      </Animated.View>

      <InlineError message={error} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="nama@email.com"
        textContentType="emailAddress"
      />
      <Field
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="Kata sandi"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <Button title="Masuk" onPress={submit} loading={loading} />
      <Button
        title="Daftar sebagai anggota"
        variant="secondary"
        onPress={() => navigation.navigate('Register')}
        style={{ marginTop: spacing.md }}
      />
      <Text style={[font.muted, styles.server]}>Server: {API_URL}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandWrapper: {
    alignItems: 'center',
    marginVertical: spacing.xxl,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 34,
    color: colors.gold,
  },
  title: {
    color: colors.gold,
    fontSize: 30,
    fontWeight: '800',
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  server: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 11,
  },
});
