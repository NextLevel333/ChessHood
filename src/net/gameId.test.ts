import { describe, expect, it } from 'vitest';
import { parseGameId } from './gameId';

describe('parseGameId', () => {
  it('accepts bare codes in any case', () => {
    expect(parseGameId(' abcd2345 ')).toBe('ABCD2345');
  });

  it('extracts the code from invite links', () => {
    expect(parseGameId('https://u.github.io/ChessHood/#/game/ABCD2345')).toBe('ABCD2345');
    expect(parseGameId('http://localhost:5173/#/game/abcd2345/')).toBe('ABCD2345');
  });

  it('rejects junk', () => {
    expect(parseGameId('')).toBeNull();
    expect(parseGameId('hi')).toBeNull();
    expect(parseGameId('ABC 123')).toBeNull();
    expect(parseGameId('0000O0000')).toBeNull();
  });
});
