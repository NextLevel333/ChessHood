/**
 * CPU opponent. Strength tiers (deliberately distinct):
 *  - easy: uniformly random legal move (plays blunders freely).
 *  - intermediate: 2-ply search (its move + your best reply) on material only,
 *    so it grabs free pieces and avoids hanging its own, but sees no deeper tactics.
 *  - hard: 3-ply alpha-beta search with capture-first move ordering, material plus
 *    simple positional terms (centre control, advanced pawns) and mate detection.
 */
import { Chess, type Move } from 'chess.js';
import type { Color } from './session';

export type Difficulty = 'easy' | 'intermediate' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'intermediate', 'hard'];

export const DIFFICULTY_INFO: Record<Difficulty, { label: string; blurb: string }> = {
  easy: { label: 'Easy', blurb: 'Plays random legal moves. Great for beginners.' },
  intermediate: {
    label: 'Intermediate',
    blurb: 'Looks 2 moves ahead; wins and protects material.',
  },
  hard: { label: 'Hard', blurb: 'Searches 3 plies with positional awareness.' },
};

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;
const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);

/** Pure colour assignment; `rng` is injectable for tests. */
export function randomHumanColor(rng: () => number = Math.random): Color {
  return rng() < 0.5 ? 'w' : 'b';
}

function evaluate(chess: Chess, positional: boolean): number {
  // Score from White's point of view.
  let score = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      let v = VALUE[cell.type];
      if (positional) {
        if (CENTER.has(cell.square)) v += 15;
        if (cell.type === 'p') {
          const rank = Number(cell.square[1]);
          v += (cell.color === 'w' ? rank - 2 : 7 - rank) * 5;
        }
      }
      score += cell.color === 'w' ? v : -v;
    }
  }
  return score;
}

function ordered(moves: Move[]): Move[] {
  const key = (m: Move) => (m.captured ? VALUE[m.captured] * 10 - VALUE[m.piece] : 0);
  return [...moves].sort((a, b) => key(b) - key(a));
}

/** Negamax with alpha-beta; returns score for the side to move. */
function search(chess: Chess, depth: number, alpha: number, beta: number, positional: boolean) {
  if (chess.isCheckmate()) return -MATE - depth;
  if (chess.isDraw() || chess.isStalemate()) return 0;
  if (depth === 0) {
    const s = evaluate(chess, positional);
    return chess.turn() === 'w' ? s : -s;
  }
  let best = -Infinity;
  for (const m of ordered(chess.moves({ verbose: true }))) {
    chess.move(m);
    const score = -search(chess, depth - 1, -beta, -alpha, positional);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Picks a legal move for the side to move in `fen`, or null if there is none. */
export function chooseMove(
  fen: string,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): Move | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  if (difficulty === 'easy') return moves[Math.floor(rng() * moves.length)];

  const depth = difficulty === 'hard' ? 3 : 2;
  const positional = difficulty === 'hard';
  let best: Move[] = [];
  let bestScore = -Infinity;
  for (const m of ordered(moves)) {
    chess.move(m);
    const score = -search(chess, depth - 1, -Infinity, Infinity, positional);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) best.push(m);
  }
  return best[Math.floor(rng() * best.length)];
}

/** True when the CPU should be scheduled to move now. */
export function shouldCpuMove(
  snapshot: { turn: Color; status: string },
  cpuColor: Color | null,
): boolean {
  return (
    cpuColor !== null &&
    snapshot.turn === cpuColor &&
    (snapshot.status === 'playing' || snapshot.status === 'check')
  );
}
