import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** Latar motif papan catur halus — cocok layar login. Tidak menggunakan gambar. */
export function ChessboardBg({ size = 40 }: { size?: number }) {
  const rows = [];
  const cols = Math.ceil(300 / size) + 2;
  const rowsCount = Math.ceil(600 / size) + 2;
  for (let r = 0; r < rowsCount; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) {
        rows.push(
          <View
            key={`${r}-${c}`}
            style={[styles.square, { left: c * size, top: r * size, width: size, height: size }]}
          />
        );
      }
    }
  }
  return <View style={styles.container}>{rows}</View>;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  square: {
    position: 'absolute',
    backgroundColor: 'rgba(244,196,48,0.04)',
  },
});
