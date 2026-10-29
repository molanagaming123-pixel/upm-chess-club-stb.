import { API_URL, REQUEST_TIMEOUT_MS } from '../config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let tokenProvider: () => string | null = () => null;
let unauthorizedHandler: (() => void) | null = null;

/** Dipanggil sekali oleh AuthProvider. */
export function configureClient(opts: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  tokenProvider = opts.getToken;
  unauthorizedHandler = opts.onUnauthorized;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  let url = `${API_URL}${path}`;
  if (query) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    if (parts.length) url += `?${parts.join('&')}`;
  }
  return url;
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; query?: Query } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      'Tidak dapat terhubung ke server. Periksa koneksi internet dan alamat server (API URL).',
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedHandler?.();
    const detail = (data as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === 'string' && detail ? detail : `Terjadi kesalahan pada server (${res.status}).`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Terjadi kesalahan tak terduga.';
}
