import { isValidISODate } from './format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateName(v: string): string | null {
  return v.trim().length >= 2 ? null : 'Nama minimal 2 karakter.';
}

export function validateEmail(v: string): string | null {
  return EMAIL_RE.test(v.trim()) ? null : 'Format email tidak valid.';
}

export function validatePassword(v: string): string | null {
  if (v.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Kata sandi harus mengandung huruf dan angka.';
  return null;
}

export function validateNim(v: string): string | null {
  const t = v.trim();
  if (!t) return null; // opsional
  return /^[A-Za-z0-9]{3,30}$/.test(t) ? null : 'NIM hanya huruf/angka (3–30 karakter).';
}

export function validateDate(v: string, label = 'Tanggal'): string | null {
  return isValidISODate(v.trim()) ? null : `${label} harus berformat YYYY-MM-DD (mis. 2026-11-30).`;
}

export function hasErrors(errors: Record<string, string | null>): boolean {
  return Object.values(errors).some((e) => !!e);
}
