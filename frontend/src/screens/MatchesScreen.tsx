import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChipRow } from '../components/Chips';
import { EmptyState } from '../components/Feedback';
import { MatchRow } from '../components/MatchRow';
import { Async } from '../components/Screen';
import { useLoad } from '../hooks/useLoad';
import { useNav } from '../navigation/types';
import { colors, font, spacing } from '../theme';

type Kind = 'turnamen' | 'persahabatan' | null;

export function MatchesScreen() {
  const nav = useNav();
  const { isAdmin } = useAuth();
  const [kind, setKind] = useState<Kind>(null);
  const state = useLoad(() => api.matches({ kind: kind ?? undefined, limit: 100 }), [kind]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <ChipRow<Kind>
          value={kind}
          onChange={setKind}
          options={[
            { value: null, label: 'Semua' },
            { value: 'turnamen', label: 'Turnamen' },
            { value: 'persahabatan', label: 'Persahabatan' },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Async
          state={state}
          footer={
            isAdmin ? (
              <Button title="+ Pertandingan persahabatan" onPress={() => nav.navigate('MatchForm')} />
            ) : undefined
          }
        >
          {(matches) =>
            matches.length === 0 ? (
              <Card>
                <EmptyState
                  icon="game-controller-outline"
                  title="Belum ada pertandingan"
                  message={isAdmin ? 'Catat pertandingan dari halaman turnamen atau tombol di bawah.' : 'Belum ada pertandingan yang tercatat.'}
                />
              </Card>
            ) : (
              <>
                <Text style={[font.muted, { marginBottom: spacing.sm }]}>
                  {matches.length} pertandingan{isAdmin ? ' · ketuk untuk mengubah hasil' : ''}
                </Text>
                {matches.map((m) => (
                  <MatchRow key={m.id} match={m} onPress={isAdmin ? () => nav.navigate('MatchForm', { matchId: m.id }) : undefined} />
                ))}
              </>
            )
          }
        </Async>
      </View>
    </SafeAreaView>
  );
}
