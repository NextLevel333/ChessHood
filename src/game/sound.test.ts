import { describe, expect, it, vi } from 'vitest';
import {
  CHECKMATE_VIBRATION,
  MUTE_KEY,
  isMuted,
  setMuted,
  soundForSan,
  vibrateCheckmate,
} from './sound';

describe('sound', () => {
  it('classifies moves', () => {
    expect(soundForSan('e4')).toBe('move');
    expect(soundForSan('Nxe5')).toBe('capture');
    expect(soundForSan('Qxf7#')).toBe('gameover');
  });

  it('persists the mute preference', () => {
    const store = { getItem: vi.fn(), setItem: vi.fn() };
    setMuted(true, store);
    expect(isMuted()).toBe(true);
    expect(store.setItem).toHaveBeenCalledWith(MUTE_KEY, '1');
    setMuted(false, store);
    expect(isMuted()).toBe(false);
  });

  it('vibrates on checkmate and no-ops when unsupported', () => {
    const vibrate = vi.fn(() => true);
    expect(vibrateCheckmate({ vibrate })).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(CHECKMATE_VIBRATION);
    expect(vibrateCheckmate({} as Navigator)).toBe(false);
  });
});
