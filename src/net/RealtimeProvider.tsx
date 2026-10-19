import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { GateInfoResponse, GateStatus, GuestSession } from '@chesshood/shared';
import { backendUrls } from '../config/env';
import { api } from './api';
import {
  RealtimeContext,
  type AppSocket,
  type BackendStatus,
  type ConnectionState,
  type RealtimeValue,
} from './RealtimeContext';

const STORAGE_KEY = 'chesshood.guest-session';

function loadStored(): GuestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<GuestSession>) : null;
    return s && [s.token, s.playerId, s.name].every((v) => typeof v === 'string' && v)
      ? (s as GuestSession)
      : null;
  } catch {
    return null;
  }
}

function store(session: GuestSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: session lasts for this tab only */
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { apiUrl, socketUrl } = backendUrls;
  const [backend, setBackend] = useState<BackendStatus>(apiUrl ? 'checking' : 'unconfigured');
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [session, setSession] = useState<GuestSession | null>(null);
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [gate, setGate] = useState<GateInfoResponse | null>(null);
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef<GuestSession | null>(null);

  useEffect(() => {
    if (!apiUrl || !socketUrl) return;
    let cancelled = false;
    let sock: AppSocket | null = null;
    let renewed = false;

    (async () => {
      try {
        await api.health(apiUrl);
        const gateInfo = await api.gateInfo(apiUrl);
        const sess = loadStored() ?? (await api.guest(apiUrl));
        store(sess);
        if (cancelled) return;
        sessionRef.current = sess;
        setSession(sess);
        setGate(gateInfo);
        setBackend('online');
        setConnection('connecting');

        sock = io(socketUrl, { auth: { token: sess.token }, reconnectionAttempts: Infinity });
        sock.on('connect', () => {
          renewed = false;
          setConnection('connected');
        });
        sock.on('disconnect', (reason) =>
          setConnection(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting'),
        );
        sock.io.on('reconnect_attempt', () => setConnection('reconnecting'));
        sock.on('connect_error', async (err) => {
          if (err.message === 'UNAUTHENTICATED' && !renewed) {
            renewed = true;
            try {
              const fresh = await api.guest(apiUrl);
              store(fresh);
              sessionRef.current = fresh;
              setSession(fresh);
              sock!.auth = { token: fresh.token };
              sock!.connect();
              return;
            } catch {
              /* fall through to reconnecting state */
            }
          }
          setConnection('reconnecting');
        });
        setSocket(sock);
      } catch {
        if (!cancelled) setBackend('unreachable');
      }
    })();

    return () => {
      cancelled = true;
      sock?.disconnect();
      setSocket(null);
    };
  }, [apiUrl, socketUrl, attempt]);

  const retry = useCallback(() => {
    setBackend(apiUrl ? 'checking' : 'unconfigured');
    setAttempt((n) => n + 1);
  }, [apiUrl]);

  const refreshGateStatus = useCallback(async () => {
    const s = sessionRef.current;
    if (!apiUrl || !s || !gate?.enabled) return;
    try {
      setGateStatus(await api.gateStatus(apiUrl, s.token));
    } catch {
      setGateStatus(null);
    }
  }, [apiUrl, gate]);

  useEffect(() => {
    // Gate status is owned by the server; this only mirrors it for display.
    void refreshGateStatus();
  }, [refreshGateStatus, session]);

  const value = useMemo<RealtimeValue>(
    () => ({
      backend,
      connection,
      apiUrl,
      session,
      socket,
      gate,
      gateStatus,
      retry,
      refreshGateStatus,
    }),
    [backend, connection, apiUrl, session, socket, gate, gateStatus, retry, refreshGateStatus],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
