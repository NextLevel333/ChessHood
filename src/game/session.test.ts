import { describe, expect, it } from 'vitest';
import { createLocalSession } from './session';

describe('local game session', () => {
  it('starts with white to move', () => {
    expect(createLocalSession().getSnapshot().turn).toBe('w');
  });

  it('applies legal moves and alternates turns', () => {
    const s = createLocalSession();
    expect(s.move('e2', 'e4')).toBe(true);
    expect(s.getSnapshot().turn).toBe('b');
    expect(s.getSnapshot().history).toEqual(['e4']);
  });

  it('rejects illegal moves', () => {
    const s = createLocalSession();
    expect(s.move('e2', 'e5')).toBe(false);
    expect(s.getSnapshot().turn).toBe('w');
  });

  it('lists legal targets', () => {
    expect(createLocalSession().legalTargets('e2').sort()).toEqual(['e3', 'e4']);
  });

  it("detects fool's mate", () => {
    const s = createLocalSession();
    s.move('f2', 'f3');
    s.move('e7', 'e5');
    s.move('g2', 'g4');
    s.move('d8', 'h4');
    expect(s.getSnapshot().status).toBe('checkmate');
    expect(s.getSnapshot().winner).toBe('b');
  });

  it('resets and notifies subscribers', () => {
    const s = createLocalSession();
    let calls = 0;
    s.subscribe(() => calls++);
    s.move('e2', 'e4');
    s.reset();
    expect(calls).toBe(2);
    expect(s.getSnapshot().history).toEqual([]);
  });
});
