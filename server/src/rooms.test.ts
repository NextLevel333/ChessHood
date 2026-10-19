import { describe, expect, it } from 'vitest';
import { GameError, RoomManager } from './rooms';

const alice = { playerId: 'alice', name: 'Alice' };
const bob = { playerId: 'bob', name: 'Bob' };
const carol = { playerId: 'carol', name: 'Carol' };

function code(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof GameError ? e.code : 'OTHER';
  }
}

function startedGame() {
  const rooms = new RoomManager();
  const { id } = rooms.createGame(alice);
  rooms.join(id, bob);
  return { rooms, id };
}

describe('RoomManager seating', () => {
  it('seats the creator as white and the first joiner as black', () => {
    const rooms = new RoomManager();
    const created = rooms.createGame(alice);
    expect(created.status).toBe('waiting');
    expect(created.players.w?.id).toBe('alice');
    const joined = rooms.join(created.id, bob);
    expect(joined.role).toBe('b');
    expect(joined.state.status).toBe('active');
  });

  it('is idempotent for reconnecting players and makes third joiners spectators', () => {
    const { rooms, id } = startedGame();
    expect(rooms.join(id, alice).role).toBe('w');
    expect(rooms.join(id, bob).role).toBe('b');
    expect(rooms.join(id.toLowerCase(), carol).role).toBe('spectator');
    expect(rooms.getState(id).players.b?.id).toBe('bob');
  });

  it('rejects unknown games', () => {
    expect(code(() => new RoomManager().join('NOPE1234', alice))).toBe('GAME_NOT_FOUND');
  });
});

describe('RoomManager moves', () => {
  it('refuses moves until both players are seated', () => {
    const rooms = new RoomManager();
    const { id } = rooms.createGame(alice);
    expect(code(() => rooms.move(id, 'alice', { from: 'e2', to: 'e4' }))).toBe('GAME_NOT_ACTIVE');
  });

  it('applies legal moves for the player whose turn it is', () => {
    const { rooms, id } = startedGame();
    const s = rooms.move(id, 'alice', { from: 'e2', to: 'e4' });
    expect(s.turn).toBe('b');
    expect(s.history).toEqual(['e4']);
    expect(s.lastMove).toEqual({ from: 'e2', to: 'e4' });
  });

  it('enforces turn order', () => {
    const { rooms, id } = startedGame();
    expect(code(() => rooms.move(id, 'bob', { from: 'e7', to: 'e5' }))).toBe('NOT_YOUR_TURN');
    rooms.move(id, 'alice', { from: 'e2', to: 'e4' });
    expect(code(() => rooms.move(id, 'alice', { from: 'd2', to: 'd4' }))).toBe('NOT_YOUR_TURN');
  });

  it('rejects illegal moves without changing state', () => {
    const { rooms, id } = startedGame();
    const before = rooms.getState(id).fen;
    expect(code(() => rooms.move(id, 'alice', { from: 'e2', to: 'e5' }))).toBe('ILLEGAL_MOVE');
    expect(code(() => rooms.move(id, 'alice', { from: 'e7', to: 'e5' }))).toBe('ILLEGAL_MOVE');
    expect(rooms.getState(id).fen).toBe(before);
  });

  it('rejects malformed payloads and non-players', () => {
    const { rooms, id } = startedGame();
    expect(code(() => rooms.move(id, 'alice', { from: 42, to: 'e4' }))).toBe('BAD_REQUEST');
    expect(code(() => rooms.move(id, 'alice', { from: 'z9', to: 'e4' }))).toBe('BAD_REQUEST');
    expect(code(() => rooms.move(id, 'alice', { from: 'e2', to: 'e4', promotion: 'k' }))).toBe(
      'BAD_REQUEST',
    );
    expect(code(() => rooms.move(id, 'carol', { from: 'e2', to: 'e4' }))).toBe('NOT_A_PLAYER');
  });

  it("detects checkmate (fool's mate) and stops further moves", () => {
    const { rooms, id } = startedGame();
    rooms.move(id, 'alice', { from: 'f2', to: 'f3' });
    rooms.move(id, 'bob', { from: 'e7', to: 'e5' });
    rooms.move(id, 'alice', { from: 'g2', to: 'g4' });
    const s = rooms.move(id, 'bob', { from: 'd8', to: 'h4' });
    expect(s.status).toBe('checkmate');
    expect(s.winner).toBe('b');
    expect(code(() => rooms.move(id, 'alice', { from: 'a2', to: 'a3' }))).toBe('GAME_NOT_ACTIVE');
  });
});

describe('RoomManager resign and rematch', () => {
  it('lets a player resign, awarding the win to the opponent', () => {
    const { rooms, id } = startedGame();
    const s = rooms.resign(id, 'alice');
    expect(s.status).toBe('resigned');
    expect(s.winner).toBe('b');
    expect(code(() => rooms.resign(id, 'carol'))).toBe('NOT_A_PLAYER');
  });

  it('only offers a rematch after the game ends, then swaps colours', () => {
    const { rooms, id } = startedGame();
    expect(code(() => rooms.rematch(id, 'alice'))).toBe('GAME_NOT_ACTIVE');
    rooms.resign(id, 'alice');
    const waiting = rooms.rematch(id, 'alice');
    expect(waiting.rematch).toEqual({ w: true, b: false });
    const fresh = rooms.rematch(id, 'bob');
    expect(fresh.status).toBe('active');
    expect(fresh.round).toBe(2);
    expect(fresh.players.w?.id).toBe('bob');
    expect(fresh.players.b?.id).toBe('alice');
    expect(fresh.history).toEqual([]);
  });
});

describe('RoomManager presence, queue and cleanup', () => {
  it('tracks connection state across multiple sockets', () => {
    const { rooms, id } = startedGame();
    rooms.connect('alice');
    rooms.connect('alice');
    expect(rooms.getState(id).players.w?.connected).toBe(true);
    expect(rooms.disconnect('alice')).toEqual([]);
    expect(rooms.disconnect('alice')).toEqual([id]);
    expect(rooms.getState(id).players.w?.connected).toBe(false);
  });

  it('pairs two quick-match players and rejects duplicate queueing', () => {
    const rooms = new RoomManager();
    rooms.connect('alice');
    rooms.connect('bob');
    expect(rooms.enqueue(alice)).toBeNull();
    expect(code(() => rooms.enqueue(alice))).toBe('ALREADY_QUEUED');
    const match = rooms.enqueue(bob);
    expect(match?.opponentId).toBe('alice');
    expect(match?.state.status).toBe('active');
    expect(match?.state.players.w?.id).toBe('alice');
  });

  it('drops disconnected players from the queue', () => {
    const rooms = new RoomManager();
    rooms.connect('alice');
    rooms.enqueue(alice);
    rooms.disconnect('alice');
    expect(rooms.queueSize()).toBe(0);
  });

  it('sweeps idle games with nobody online', () => {
    let t = 0;
    const rooms = new RoomManager({ now: () => t, idleTtlMs: 1000 });
    const { id } = rooms.createGame(alice);
    t = 500;
    expect(rooms.sweep()).toBe(0);
    t = 2000;
    expect(rooms.sweep()).toBe(1);
    expect(code(() => rooms.getState(id))).toBe('GAME_NOT_FOUND');
  });
});
