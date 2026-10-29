import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** Simbol logo ST Bhinneka (tanpa tulisan) di dalam lingkaran, selaras dengan latar gelap. */
export function LogoBadge({ size = 112 }: { size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={require('../../assets/logo-stb.png')}
        style={{ width: size * 0.9, height: size * 0.9 }}
        resizeMode="contain"
        accessibilityLabel="Logo Universitas Satya Terra Bhinneka"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.gold,
    overflow: 'hidden',
  },
});
