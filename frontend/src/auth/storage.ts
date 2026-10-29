import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'upm_chess_token';

/** Token disimpan di SecureStore (Android/iOS). Di web (hanya untuk uji coba) memakai localStorage. */
export async function loadToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, token);
    else await SecureStore.setItemAsync(KEY, token);
  } catch {
    // Jika penyimpanan gagal, sesi tetap berjalan sampai aplikasi ditutup.
  }
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // diabaikan
  }
}
