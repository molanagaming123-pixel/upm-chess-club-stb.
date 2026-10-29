import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ColorValue } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function GradientCard({
  children,
  colors: gradColors = [colors.blue, colors.bg] as ColorValue[],
  style,
}: {
  children: React.ReactNode;
  colors?: ColorValue[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      {...{
        colors: gradColors as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]],
        style: [{ ...styles.card, borderRadius: radius.lg }, style],
      }}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
