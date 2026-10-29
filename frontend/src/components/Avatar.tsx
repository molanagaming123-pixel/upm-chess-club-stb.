import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

export function Avatar({
  name,
  size = 40,
  style,
}: {
  name?: string | null;
  size?: number;
  style?: ViewStyle;
}) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';
  const bg = name ? colors.surfaceAlt : colors.border;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <View style={[styles.circle, { width: size, height: size }]}>
        <Text style={[styles.text, { fontSize: size * 0.35 }]}>{initials}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circle: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
});
