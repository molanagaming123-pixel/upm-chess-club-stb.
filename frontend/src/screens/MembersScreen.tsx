import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Member, UserStatus, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge, ChipRow } from '../components/Chips';
import { EmptyState } from '../components/Feedback';
import { Async } from '../components/Screen';
import { Avatar } from '../components/Avatar';
import { useLoad } from '../hooks/useLoad';
import { useNav } from '../navigation/types';
import { colors, font, radius, spacing } from '../theme';
import { formatDate, userStatusLabel } from '../utils/format';

export function MembersScreen() {
  const nav = useNav();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<UserStatus | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const state = useLoad(() => api.members(debounced || undefined, status ?? undefined), [debounced, status]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={isAdmin ? 'Cari nama, NIM, atau email…' : 'Cari nama anggota…'}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Cari anggota"
          autoCapitalize="none"
          style={{
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            color: colors.text,
            paddingHorizontal: spacing.md,
            minHeight: 46,
            marginBottom: spacing.sm,
          }}
        />
        {isAdmin ? (
          <ChipRow<UserStatus | null>
            value={status}
            onChange={setStatus}
            options={[
              { value: null, label: 'Semua' },
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Nonaktif' },
            ]}
          />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Async
          state={state}
          footer={isAdmin ? <Button title="+ Tambah anggota" onPress={() => nav.navigate('MemberForm')} /> : undefined}
        >
          {(members) =>
            members.length === 0 ? (
              <Card>
                <EmptyState
                  icon="people-outline"
                  title={debounced || status ? 'Tidak ada anggota yang cocok' : 'Belum ada anggota'}
                  message={
                    debounced || status
                      ? 'Coba ubah kata kunci atau filter.'
                      : isAdmin
                        ? 'Tambahkan anggota pertama klub.'
                        : 'Pengurus belum menambahkan anggota.'
                  }
                />
              </Card>
            ) : (
              <>
                <Text style={[font.muted, { marginBottom: spacing.sm }]}>{members.length} anggota</Text>
                {members.map((m) => (
                  <MemberCard key={m.id} member={m} showPrivate={isAdmin} onPress={() => nav.navigate('MemberDetail', { id: m.id })} />
                ))}
              </>
            )
          }
        </Async>
      </View>
    </SafeAreaView>
  );
}

function MemberCard({ member, showPrivate, onPress }: { member: Member; showPrivate: boolean; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headRow}>
        <Avatar name={member.name} size={44} />
        <View style={styles.info}>
          <Text style={[font.heading, { flex: 1 }]} numberOfLines={1}>{member.name}</Text>
          <Badge label={userStatusLabel[member.status]} tone={member.status === 'active' ? 'success' : 'neutral'} />
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={font.muted}>Bergabung {formatDate(member.joined_at)}</Text>
        {showPrivate && member.nim ? <Text style={font.muted}>· NIM {member.nim}</Text> : null}
      </View>
      {showPrivate && member.email ? <Text style={font.muted}>{member.email}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

