import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function SkeletonText({
  width = '40%',
  height = 14,
  style,
}: { width?: string | number; height?: number; style?: ViewStyle }) {
  return (
    <View style={[styles.bar, { width, height }, style]} />
  );
}

export function SkeletonRow({ height = 56 }: { height?: number }) {
  return (
    <View style={[styles.row, { height }]}>
      <View style={[styles.bar, { width: '55%', height: 14 }]} />
      <View style={[styles.bar, { width: '30%', height: 14, marginLeft: spacing.sm }]} />
      <View style={[styles.bar, { width: '15%', height: 14, marginLeft: 'auto' }]} />
    </View>
  );
}

export function SkeletonStat({ size = 72 }: { size?: number }) {
  return (
    <View style={[styles.stat, { width: size, height: size }]} />
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  stat: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
});
