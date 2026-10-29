import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../theme';
import { Button } from './Button';

export interface PickerOption {
  id: number;
  name: string;
  subtitle?: string;
}

interface Props {
  label: string;
  value: number | null;
  options: PickerOption[];
  onChange: (id: number) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

/** Kolom pilihan pemain: membuka daftar yang bisa dicari. */
export function PlayerPicker({ label, value, options, onChange, placeholder = 'Pilih pemain', emptyText, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.name ?? placeholder}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, disabled && { opacity: 0.5 }]}
      >
        <Text style={[styles.value, !selected && { color: colors.textMuted }]}>{selected?.name ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={font.heading}>{label}</Text>
            <Button title="Tutup" onPress={close} variant="ghost" small />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari nama…"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            autoCapitalize="none"
            accessibilityLabel="Cari nama"
          />
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[font.muted, { textAlign: 'center', marginTop: spacing.xl }]}>
                {emptyText ?? 'Tidak ada pilihan yang cocok.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(item.id);
                  close();
                }}
                style={[styles.item, item.id === value && styles.itemSelected]}
              >
                <Text style={font.body}>{item.name}</Text>
                {item.subtitle ? <Text style={font.muted}>{item.subtitle}</Text> : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs, fontWeight: '600' },
  field: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { color: colors.text, fontSize: 16 },
  modal: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  search: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    marginBottom: spacing.md,
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemSelected: { backgroundColor: colors.surface },
});
