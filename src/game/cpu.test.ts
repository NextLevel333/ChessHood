import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { chooseMove, randomHumanColor, shouldCpuMove, DIFFICULTIES } from './cpu';

describe('cpu', () => {
  it('assigns colour from rng', () => {
    expect(randomHumanColor(() => 0.1)).toBe('w');
    expect(randomHumanColor(() => 0.9)).toBe('b');
  });

  it('always returns a legal move at every difficulty', () => {
    for (const d of DIFFICULTIES) {
      const c = new Chess();
      const m = chooseMove(c.fen(), d)!;
      expect(c.moves({ verbose: true }).some((x) => x.from === m.from && x.to === m.to)).toBe(true);
    }
  });

  it('returns null when no moves', () => {
    const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
    expect(chooseMove(fen, 'hard')).toBeNull();
  });

  it('intermediate and hard take a free queen; hard finds mate in one', () => {
    const free = '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1';
    expect(chooseMove(free, 'intermediate')!.to).toBe('d5');
    expect(chooseMove(free, 'hard')!.to).toBe('d5');
    const mate = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1';
    expect(chooseMove(mate, 'hard')!.san).toBe('Ra8#');
  });

  it('schedules the CPU only on its turn while the game is live', () => {
    expect(shouldCpuMove({ turn: 'w', status: 'playing' }, 'w')).toBe(true);
    expect(shouldCpuMove({ turn: 'b', status: 'check' }, 'w')).toBe(false);
    expect(shouldCpuMove({ turn: 'w', status: 'checkmate' }, 'w')).toBe(false);
    expect(shouldCpuMove({ turn: 'w', status: 'playing' }, null)).toBe(false);
  });
});
