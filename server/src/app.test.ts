import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import type { Ack, GameState, GuestSession, JoinResult } from '@chesshood/shared';
import { createApp, type RunningApp } from './app';
import { loadConfig } from './config';

let running: RunningApp | null = null;
const sockets: Socket[] = [];

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.close());
  await running?.close();
  running = null;
});

async function boot() {
  const config = loadConfig({ CORS_ORIGINS: 'http://localhost:5173' }, () => 's'.repeat(40));
  running = createApp({ config });
  await new Promise<void>((r) => running!.httpServer.listen(0, r));
  const url = `http://localhost:${(running.httpServer.address() as AddressInfo).port}`;
  return url;
}

async function guest(url: string): Promise<GuestSession> {
  return (await fetch(`${url}/api/guest`, { method: 'POST' })).json() as Promise<GuestSession>;
}

async function client(url: string, token: string): Promise<Socket> {
  const s = connect(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  sockets.push(s);
  await new Promise<void>((res, rej) => {
    s.once('connect', () => res());
    s.once('connect_error', rej);
  });
  return s;
}

const emit = <T>(s: Socket, ev: string, ...args: unknown[]) =>
  new Promise<Ack<T>>((res) => s.emit(ev, ...args, res));

describe('realtime server', () => {
  it('serves health and refuses unauthenticated sockets', async () => {
    const url = await boot();
    expect(((await (await fetch(`${url}/health`)).json()) as { status: string }).status).toBe('ok');
    const gate = (await (await fetch(`${url}/api/gate`)).json()) as { enabled: boolean };
    expect(gate.enabled).toBe(false);
    const bad = connect(url, {
      auth: { token: 'nope' },
      transports: ['websocket'],
      forceNew: true,
    });
    sockets.push(bad);
    const err = await new Promise<Error>((r) => bad.once('connect_error', r));
    expect(err.message).toBe('UNAUTHENTICATED');
  });

  it('runs a two-player game with server-side validation and broadcasts', async () => {
    const url = await boot();
    const [g1, g2] = [await guest(url), await guest(url)];
    const [a, b] = [await client(url, g1.token), await client(url, g2.token)];

    const created = await emit<JoinResult>(a, 'game:create', {});
    if (!created.ok) throw new Error('create failed');
    const id = created.state.id;
    expect(created.role).toBe('w');

    const updates: GameState[] = [];
    a.on('game:state', (s: GameState) => updates.push(s));
    const joined = await emit<JoinResult>(b, 'game:join', { gameId: id });
    expect(joined.ok && joined.role).toBe('b');

    // wrong turn, illegal move and spoofed client state are all refused
    const early = await emit(b, 'game:move', { gameId: id, from: 'e7', to: 'e5' });
    expect(early.ok === false && early.error.code).toBe('NOT_YOUR_TURN');
    const illegal = await emit(a, 'game:move', { gameId: id, from: 'e2', to: 'e5' });
    expect(illegal.ok === false && illegal.error.code).toBe('ILLEGAL_MOVE');
    const spoof = await emit(a, 'game:move', {
      gameId: id,
      from: 'e2',
      to: 'e4',
      fen: 'k7/8/8/8/8/8/8/K6R w - - 0 1',
      winner: 'w',
    });
    expect(spoof.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 50));
    const last = updates[updates.length - 1];
    expect(last.history).toEqual(['e4']);
    expect(last.turn).toBe('b');
    expect(last.status).toBe('active');

    const resigned = await emit(b, 'game:resign', { gameId: id });
    expect(resigned.ok).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(updates[updates.length - 1].winner).toBe('w');
  });

  it('matches two quick-match players', async () => {
    const url = await boot();
    const a = await client(url, (await guest(url)).token);
    const b = await client(url, (await guest(url)).token);
    const matched = new Promise<{ gameId: string }>((r) => a.once('queue:matched', r));
    const first = await emit<{ gameId?: string }>(a, 'queue:join');
    expect(first.ok && first.gameId).toBeFalsy();
    const second = await emit<{ gameId?: string }>(b, 'queue:join');
    expect(second.ok && second.gameId).toBeTruthy();
    expect((await matched).gameId).toBe(second.ok ? second.gameId : '');
  });

  it('rejects arena rooms when the gate is disabled', async () => {
    const url = await boot();
    const a = await client(url, (await guest(url)).token);
    const res = await emit(a, 'game:create', { arena: true });
    expect(res.ok === false && res.error.code).toBe('BAD_REQUEST');
  });
});
