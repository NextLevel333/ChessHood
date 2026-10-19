/**
 * In-memory, server-authoritative game rooms. This module is transport-agnostic and has no
 * knowledge of sockets, so it is easy to unit test and later back with PostgreSQL/Redis.
 *
 * NOTE: all state lives in process memory. Restarting the server drops every game.
 */
import { randomBytes } from 'node:crypto';
import { Chess } from 'chess.js';
import type {
  Color,
  ErrorCode,
  GameState,
  GameStatus,
  PlayerInfo,
  PromotionPiece,
  Role,
} from '@chesshood/shared';
import type { Identity } from './auth';

export class GameError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SQUARE_RE = /^[a-h][1-8]$/;
const PROMOTIONS = new Set<string>(['q', 'r', 'b', 'n']);

interface Seat {
  id: string;
  name: string;
}

interface Game {
  id: string;
  chess: Chess;
  seats: { w: Seat | null; b: Seat | null };
  arena: boolean;
  round: number;
  resignedWinner: Color | null;
  lastMove: { from: string; to: string } | null;
  rematch: { w: boolean; b: boolean };
  lastActivity: number;
}

export interface RoomOptions {
  now?: () => number;
  maxGames?: number;
  idleTtlMs?: number;
}

export function normalizeGameId(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

export class RoomManager {
  private readonly games = new Map<string, Game>();
  private readonly online = new Map<string, number>();
  private queue: Seat[] = [];
  private readonly now: () => number;
  private readonly maxGames: number;
  private readonly idleTtlMs: number;

  constructor(opts: RoomOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.maxGames = opts.maxGames ?? 5000;
    this.idleTtlMs = opts.idleTtlMs ?? 2 * 60 * 60_000;
  }

  // --- presence -----------------------------------------------------------------------

  /** Mark a socket connected. */
  connect(playerId: string) {
    this.online.set(playerId, (this.online.get(playerId) ?? 0) + 1);
  }

  /** Mark a socket disconnected. Returns ids of games whose presence changed. */
  disconnect(playerId: string): string[] {
    const n = (this.online.get(playerId) ?? 1) - 1;
    if (n > 0) {
      this.online.set(playerId, n);
      return [];
    }
    this.online.delete(playerId);
    this.leaveQueue(playerId);
    return this.gamesFor(playerId);
  }

  isOnline(playerId: string): boolean {
    return this.online.has(playerId);
  }

  gamesFor(playerId: string): string[] {
    return [...this.games.values()]
      .filter((g) => g.seats.w?.id === playerId || g.seats.b?.id === playerId)
      .map((g) => g.id);
  }

  // --- lifecycle ------------------------------------------------------------------------

  createGame(owner: Identity, opts: { arena?: boolean } = {}): GameState {
    return this.stateOf(this.newGame({ id: owner.playerId, name: owner.name }, null, !!opts.arena));
  }

  /** Join a room. The first two participants are seated (creator = white); others spectate. */
  join(gameId: string, who: Identity): { role: Role; state: GameState } {
    const game = this.mustGet(gameId);
    game.lastActivity = this.now();
    const role = this.roleOf(game, who.playerId);
    if (role) return { role, state: this.stateOf(game) };
    if (!game.seats.w) game.seats.w = { id: who.playerId, name: who.name };
    else if (!game.seats.b) game.seats.b = { id: who.playerId, name: who.name };
    else return { role: 'spectator', state: this.stateOf(game) };
    return { role: this.roleOf(game, who.playerId)!, state: this.stateOf(game) };
  }

  getState(gameId: string): GameState {
    return this.stateOf(this.mustGet(gameId));
  }

  isArena(gameId: string): boolean {
    return this.mustGet(gameId).arena;
  }

  /** Apply a move. Only the server's own chess.js state is consulted for legality. */
  move(
    gameId: string,
    who: string,
    req: { from?: unknown; to?: unknown; promotion?: unknown },
  ): GameState {
    const game = this.mustGet(gameId);
    const color = this.roleOf(game, who);
    if (!color) throw new GameError('NOT_A_PLAYER', 'You are not a player in this game.');
    if (this.statusOf(game) !== 'active') {
      throw new GameError('GAME_NOT_ACTIVE', 'This game is not in progress.');
    }
    if (typeof req.from !== 'string' || typeof req.to !== 'string') {
      throw new GameError('BAD_REQUEST', 'Move requires "from" and "to" squares.');
    }
    if (!SQUARE_RE.test(req.from) || !SQUARE_RE.test(req.to)) {
      throw new GameError('BAD_REQUEST', 'Invalid square.');
    }
    if (
      req.promotion !== undefined &&
      (typeof req.promotion !== 'string' || !PROMOTIONS.has(req.promotion))
    ) {
      throw new GameError('BAD_REQUEST', 'Invalid promotion piece.');
    }
    if (game.chess.turn() !== color) throw new GameError('NOT_YOUR_TURN', 'It is not your turn.');
    try {
      game.chess.move({
        from: req.from,
        to: req.to,
        promotion: req.promotion as PromotionPiece | undefined,
      });
    } catch {
      throw new GameError('ILLEGAL_MOVE', `Illegal move: ${req.from}-${req.to}.`);
    }
    game.lastMove = { from: req.from, to: req.to };
    game.lastActivity = this.now();
    return this.stateOf(game);
  }

  resign(gameId: string, who: string): GameState {
    const game = this.mustGet(gameId);
    const color = this.roleOf(game, who);
    if (!color) throw new GameError('NOT_A_PLAYER', 'You are not a player in this game.');
    if (this.statusOf(game) !== 'active') {
      throw new GameError('GAME_NOT_ACTIVE', 'This game is not in progress.');
    }
    game.resignedWinner = color === 'w' ? 'b' : 'w';
    game.lastActivity = this.now();
    return this.stateOf(game);
  }

  /** Request a rematch. When both players ask, colours swap and a fresh game starts. */
  rematch(gameId: string, who: string): GameState {
    const game = this.mustGet(gameId);
    const color = this.roleOf(game, who);
    if (!color) throw new GameError('NOT_A_PLAYER', 'You are not a player in this game.');
    const status = this.statusOf(game);
    if (status === 'active' || status === 'waiting') {
      throw new GameError('GAME_NOT_ACTIVE', 'Rematch is only available after the game ends.');
    }
    game.rematch[color] = true;
    game.lastActivity = this.now();
    if (game.rematch.w && game.rematch.b) {
      game.seats = { w: game.seats.b, b: game.seats.w };
      game.chess = new Chess();
      game.resignedWinner = null;
      game.lastMove = null;
      game.rematch = { w: false, b: false };
      game.round += 1;
    }
    return this.stateOf(game);
  }

  // --- quick match --------------------------------------------------------------------

  /** Returns the new game when an opponent was waiting, otherwise queues the player. */
  enqueue(who: Identity): { state: GameState; opponentId: string } | null {
    if (this.queue.some((s) => s.id === who.playerId)) {
      throw new GameError('ALREADY_QUEUED', 'You are already in the quick-match queue.');
    }
    this.queue = this.queue.filter((s) => this.isOnline(s.id));
    const opponent = this.queue.shift();
    if (!opponent) {
      this.queue.push({ id: who.playerId, name: who.name });
      return null;
    }
    const game = this.newGame(opponent, { id: who.playerId, name: who.name }, false);
    return { state: this.stateOf(game), opponentId: opponent.id };
  }

  leaveQueue(playerId: string) {
    this.queue = this.queue.filter((s) => s.id !== playerId);
  }

  queueSize(): number {
    return this.queue.length;
  }

  // --- maintenance --------------------------------------------------------------------

  /** Drop idle games. Returns the number removed. */
  sweep(): number {
    const cutoff = this.now() - this.idleTtlMs;
    let removed = 0;
    for (const [id, g] of this.games) {
      const anyOnline = [g.seats.w, g.seats.b].some((s) => s && this.isOnline(s.id));
      if (g.lastActivity < cutoff && !anyOnline) {
        this.games.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  gameCount(): number {
    return this.games.size;
  }

  // --- internals ----------------------------------------------------------------------

  private newGame(white: Seat, black: Seat | null, arena: boolean): Game {
    if (this.games.size >= this.maxGames) {
      throw new GameError('SERVER_FULL', 'Server is at capacity. Try again later.');
    }
    let id: string;
    do {
      const bytes = randomBytes(8);
      id = Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
    } while (this.games.has(id));
    const game: Game = {
      id,
      chess: new Chess(),
      seats: { w: { id: white.id, name: white.name }, b: black },
      arena,
      round: 1,
      resignedWinner: null,
      lastMove: null,
      rematch: { w: false, b: false },
      lastActivity: this.now(),
    };
    this.games.set(id, game);
    return game;
  }

  private mustGet(rawId: string): Game {
    const game = this.games.get(normalizeGameId(rawId));
    if (!game) throw new GameError('GAME_NOT_FOUND', 'Game not found.');
    return game;
  }

  private roleOf(game: Game, playerId: string): Color | null {
    if (game.seats.w?.id === playerId) return 'w';
    if (game.seats.b?.id === playerId) return 'b';
    return null;
  }

  private statusOf(game: Game): GameStatus {
    if (game.resignedWinner) return 'resigned';
    if (game.chess.isCheckmate()) return 'checkmate';
    if (game.chess.isStalemate()) return 'stalemate';
    if (game.chess.isDraw()) return 'draw';
    if (!game.seats.w || !game.seats.b) return 'waiting';
    return 'active';
  }

  private info(seat: Seat | null): PlayerInfo | null {
    return seat ? { id: seat.id, name: seat.name, connected: this.isOnline(seat.id) } : null;
  }

  private stateOf(game: Game): GameState {
    const status = this.statusOf(game);
    const turn = game.chess.turn();
    let winner: Color | null = null;
    if (status === 'checkmate') winner = turn === 'w' ? 'b' : 'w';
    else if (status === 'resigned') winner = game.resignedWinner;
    return {
      id: game.id,
      fen: game.chess.fen(),
      turn,
      status,
      winner,
      inCheck: game.chess.inCheck(),
      history: game.chess.history(),
      lastMove: game.lastMove,
      players: { w: this.info(game.seats.w), b: this.info(game.seats.b) },
      arena: game.arena,
      round: game.round,
      rematch: { ...game.rematch },
    };
  }
}
