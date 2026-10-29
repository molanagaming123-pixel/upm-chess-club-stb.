import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/Card';
import { EmptyState } from '../components/Feedback';
import { Async } from '../components/Screen';
import { GradientCard } from '../components/GradientCard';
import { Podium } from '../components/Podium';
import { StandingsTable } from '../components/StandingsTable';
import { useLoad } from '../hooks/useLoad';
import { useNav } from '../navigation/types';
import { colors, font, spacing } from '../theme';

export function StandingsScreen() {
  const nav = useNav();
  const { user } = useAuth();
  const state = useLoad(() => api.standings());

  return (
    <Async state={state}>
      {(rows) => {
        const anyPlayed = rows.some((r) => r.played > 0);
        const top3 = rows.slice(0, 3).filter((r) => r.played > 0);
        return (
          <>
            <View style={styles.header}>
              <View>
                <Text style={font.title}>Peringkat Klub</Text>
                <Text style={[font.muted, { marginTop: 4 }]}>
                  Dihitung otomatis dari seluruh hasil pertandingan yang tercatat.
                </Text>
              </View>
            </View>

            {rows.length === 0 ? (
              <Card>
                <EmptyState icon="podium-outline" title="Belum ada pemain" message="Tambahkan anggota dan catat pertandingan untuk melihat peringkat." />
              </Card>
            ) : (
              <>
                {!anyPlayed ? (
                  <Text style={[font.muted, { marginBottom: spacing.md }]}>
                    Belum ada hasil pertandingan. Semua pemain masih berpoin 0.
                  </Text>
                ) : null}

                {/* Podium 3 besar */}
                {top3.length > 0 ? (
                  <GradientCard colors={[colors.gold, colors.amber]} style={{ marginBottom: spacing.lg }}>
                    <Text style={[font.heading, { textAlign: 'center', marginBottom: spacing.md, color: colors.onGold }]}>🏆 3 Besar</Text>
                    <Podium
                      rows={top3.map((r) => ({ ...r, name: r.name }))}
                      highlightUserId={user?.id}
                      size="md"
                      onGold
                    />
                  </GradientCard>
                ) : null}

                <StandingsTable
                  rows={rows}
                  highlightUserId={user?.id}
                  onRowPress={(r) => nav.navigate('MemberDetail', { id: r.user_id })}
                />
              </>
            )}
          </>
        );
      }}
    </Async>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
});

