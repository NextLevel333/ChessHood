/**
 * Public, browser-visible configuration. Everything here ships in the bundle:
 * never put secrets, private keys or RPC credentials in VITE_* variables.
 */
type Env = Record<string, string | undefined>;

export interface BackendUrls {
  /** HTTP API base URL, or null when no backend is configured. */
  apiUrl: string | null;
  /** Socket.IO URL (defaults to the API URL). */
  socketUrl: string | null;
}

function clean(v: string | undefined): string | null {
  const t = v?.trim().replace(/\/+$/, '');
  return t ? t : null;
}

export function resolveBackendUrls(env: Env, dev: boolean): BackendUrls {
  const apiUrl = clean(env.VITE_API_URL) ?? (dev ? 'http://localhost:3001' : null);
  const socketUrl = clean(env.VITE_SOCKET_URL) ?? apiUrl;
  return { apiUrl, socketUrl };
}

export const backendUrls = resolveBackendUrls(
  import.meta.env as unknown as Env,
  import.meta.env.DEV,
);
