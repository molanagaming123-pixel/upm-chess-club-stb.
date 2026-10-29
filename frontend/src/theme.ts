/** Palet warna selaras logo ST Bhinneka (biru tua, emas, hijau daun, merah, kuning).
 *  Mode gelap = default; mode terang = alternatif nyaman di mata. */
export const colors = {
  // --- gelap (default) ---
  bg: '#0A1628', // latar utama gelap
  surface: '#13243D', // kartu
  surfaceAlt: '#0E1C30', // kartu tombol/fieldset
  border: '#2A4A7A', // garis pemisah
  text: '#F0F4F8', // teks utama
  textMuted: '#9FB3D1', // teks sekunder

  // aksen logo STB
  gold: '#F4C430', // emas kuning (busur atas)
  goldDark: '#B8932A',
  onGold: '#141005',
  blue: '#1E5FAE', // biru (busur kiri)
  green: '#2E7D32', // hijau daun (emblema tengah)
  greenLight: '#66BB6A',
  red: '#C0392B', // merah (busur bawah)
  amber: '#FFB300', // kuning terang

  // status
  danger: '#E5645F',
  success: '#4CC38A',
  warning: '#E0A93B',
  info: '#6EA8FF',

  // --- terang ---
  light: {
    bg: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2F6',
    border: '#C9D4E0',
    text: '#1A2332',
    textMuted: '#6B7B90',
    gold: '#D4A017',
    goldDark: '#B8932A',
    onGold: '#FFFFFF',
    blue: '#1E5FAE',
    green: '#1B7A36',
    greenLight: '#2E7D32',
    red: '#A93226',
    amber: '#E6A100',
    danger: '#C4453C',
    success: '#2E8B57',
    warning: '#B8860B',
    info: '#2A6FA5',
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  title: { fontSize: 22, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  small: { fontSize: 11, color: colors.textMuted },
} as const;

/** Dapatkan warna sesuai mode (terang/gelap). default = gelap. */
export function getColors(light = false) {
  return light ? colors.light : colors;
}
