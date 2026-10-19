import type {
  GateChallenge,
  GateInfoResponse,
  GateStatus,
  GuestSession,
  HealthResponse,
} from '@chesshood/shared';

async function request<T>(
  base: string,
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  health: (base: string) => request<HealthResponse>(base, '/health'),
  guest: (base: string) => request<GuestSession>(base, '/api/guest', { method: 'POST' }),
  gateInfo: (base: string) => request<GateInfoResponse>(base, '/api/gate'),
  gateStatus: (base: string, token: string) =>
    request<GateStatus>(base, '/api/gate/status', { token }),
  gateChallenge: (base: string, token: string, address: string) =>
    request<GateChallenge>(base, '/api/gate/challenge', {
      method: 'POST',
      token,
      body: { address },
    }),
  gateVerify: (base: string, token: string, address: string, signature: string) =>
    request<GateStatus>(base, '/api/gate/verify', {
      method: 'POST',
      token,
      body: { address, signature },
    }),
};
