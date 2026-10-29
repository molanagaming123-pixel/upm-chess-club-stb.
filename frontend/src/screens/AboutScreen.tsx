import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Animated, Easing } from 'react-native';
import { Card } from '../components/Card';
import { LogoBadge } from '../components/LogoBadge';
import { GradientCard } from '../components/GradientCard';
import { EmptyState } from '../components/Feedback';
import { colors, font, spacing } from '../theme';

export function AboutScreen() {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <GradientCard colors={[colors.blue, colors.bg]} style={styles.logoCard}>
        <LogoBadge size={120} />
        <Text style={styles.appTitle}>UPM Chess Club</Text>
        <Text style={styles.appSubtitle}>Manajemen Klub Catur</Text>
      </GradientCard>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Tentang Aplikasi</Text>
        <Text style={styles.body}>
          Aplikasi mobile untuk mengelola kegiatan UPM Chess Club: anggota, turnamen,
          peserta, pairing/pertandingan, hasil, peringkat otomatis, dan statistik pemain.
          Bukan game catur online.
        </Text>
        <Text style={styles.sectionTitle}>Dikembangkan oleh</Text>
        <Text style={styles.developer}>Kelompok 7</Text>
        <Text style={styles.university}>Universitas Satya Terra Bhinneka</Text>
        <Text style={styles.university}>Teknik Informatika — Tugas RPL</Text>

        <View style={styles.divider} />
        <Text style={styles.stack}>
          Expo (React Native · TypeScript) · FastAPI · SQLite · JWT + bcrypt
        </Text>
        <Text style={styles.version}>Versi 1.0.0</Text>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    padding: spacing.lg,
  },
  logoCard: {
    alignItems: 'center',
    marginVertical: spacing.xl,
    width: '100%',
    maxWidth: 260,
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
  appTitle: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '800',
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  appSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  infoCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  developer: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.lg,
    letterSpacing: 1,
  },
  university: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
    alignSelf: 'center',
  },
  stack: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  version: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
