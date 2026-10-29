/**
 * Alamat backend. Diatur lewat EXPO_PUBLIC_API_URL (lihat .env.example).
 * Nilai ini PUBLIK (ikut terbundel ke aplikasi): jangan taruh secret apa pun di sini.
 *
 * Catatan: `localhost` di HP/emulator Android BUKAN laptop Anda.
 *  - Emulator Android  -> http://10.0.2.2:8000
 *  - HP fisik          -> http://<IP-LAN-laptop>:8000 (satu Wi-Fi), atau URL server publik
 */
declare const process: { env: Record<string, string | undefined> };

const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
export const API_URL = raw.replace(/\/+$/, '');
export const REQUEST_TIMEOUT_MS = 15000;
