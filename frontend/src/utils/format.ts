import type { Match, RegistrationStatus, ResultType, TournamentStatus, UserStatus } from '../api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** '2026-10-25' -> '25 Okt 2026' (tanpa Intl agar konsisten di semua perangkat). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
}

/** Tanggal hari ini (zona waktu perangkat) dalam format YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const tournamentStatusLabel: Record<TournamentStatus, string> = {
  upcoming: 'Mendatang',
  ongoing: 'Berlangsung',
  finished: 'Selesai',
};

export const userStatusLabel: Record<UserStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
};

export const registrationLabel: Record<RegistrationStatus, string> = {
  pending: 'Menunggu persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const resultOptions: { value: ResultType | null; label: string }[] = [
  { value: null, label: 'Belum dimainkan' },
  { value: 'white_win', label: 'Putih menang' },
  { value: 'black_win', label: 'Hitam menang' },
  { value: 'draw', label: 'Seri' },
];

export function resultScore(result: ResultType | null): string {
  switch (result) {
    case 'white_win':
      return '1 – 0';
    case 'black_win':
      return '0 – 1';
    case 'draw':
      return '½ – ½';
    default:
      return 'vs';
  }
}

export function resultText(result: ResultType | null): string {
  return resultOptions.find((o) => o.value === result)?.label ?? 'Belum dimainkan';
}

/** Hasil dari sudut pandang satu pemain: 'M' menang, 'S' seri, 'K' kalah, null belum dimainkan. */
export function outcomeFor(match: Match, userId: number): 'M' | 'S' | 'K' | null {
  if (!match.result) return null;
  if (match.result === 'draw') return 'S';
  const whiteWon = match.result === 'white_win';
  const iAmWhite = match.white_id === userId;
  return whiteWon === iAmWhite ? 'M' : 'K';
}
