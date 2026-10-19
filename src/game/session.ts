/**
 * Game/session layer. UI components depend only on this interface, so a
 * real-time (WebSocket) implementation can replace the local one later.
 */
import { Chess, type Square } from 'chess.js';

export type Color = 'w' | 'b';

export interface GameSnapshot {
  fen: string;
  turn: Color;
  history: string[];
  status: 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';
  winner: Color | null;
  inCheck: boolean;
  lastMove: { from: Square; to: Square } | null;
}

export interface GameSession {
  getSnapshot(): GameSnapshot;
  legalTargets(from: Square): Square[];
  move(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): boolean;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

export function createLocalSession(): GameSession {
  let chess = new Chess();
  let lastMove: GameSnapshot['lastMove'] = null;
  let snapshot = build();
  const listeners = new Set<() => void>();

  function build(): GameSnapshot {
    const turn = chess.turn();
    let status: GameSnapshot['status'] = 'playing';
    if (chess.isCheckmate()) status = 'checkmate';
    else if (chess.isStalemate()) status = 'stalemate';
    else if (chess.isDraw()) status = 'draw';
    else if (chess.inCheck()) status = 'check';
    return {
      fen: chess.fen(),
      turn,
      history: chess.history(),
      status,
      winner: status === 'checkmate' ? (turn === 'w' ? 'b' : 'w') : null,
      inCheck: chess.inCheck(),
      lastMove,
    };
  }

  function emit() {
    snapshot = build();
    listeners.forEach((l) => l());
  }

  return {
    // Returns a cached object so it is stable for useSyncExternalStore.
    getSnapshot: () => snapshot,
    legalTargets: (from) => chess.moves({ square: from, verbose: true }).map((m) => m.to),
    move(from, to, promotion = 'q') {
      try {
        chess.move({ from, to, promotion });
      } catch {
        return false;
      }
      lastMove = { from, to };
      emit();
      return true;
    },
    reset() {
      chess = new Chess();
      lastMove = null;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
