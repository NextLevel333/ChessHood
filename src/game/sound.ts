/**
 * Lightweight synthesized chess sounds (Web Audio, no audio assets) plus checkmate haptics.
 * Everything is a no-op where unsupported (SSR, old browsers, no AudioContext) and audio is
 * only created lazily after a game action, so autoplay policies are respected.
 */
import { useSyncExternalStore } from 'react';

export type SoundKind = 'move' | 'capture' | 'gameover';

export const MUTE_KEY = 'chesshood.muted';
export const CHECKMATE_VIBRATION = [200, 100, 200, 100, 400];

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function storage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

let muted = storage()?.getItem(MUTE_KEY) === '1';
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean, store: StorageLike | null = storage()) {
  muted = value;
  try {
    store?.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* preference simply won't persist */
  }
  listeners.forEach((l) => l());
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
    () => false,
  );
}

/** Classifies the latest move from its SAN. */
export function soundForSan(san: string): SoundKind {
  if (san.includes('#')) return 'gameover';
  return san.includes('x') ? 'capture' : 'move';
}

let ctx: AudioContext | null = null;

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur);
}

export function playSound(kind: SoundKind) {
  if (muted) return;
  try {
    const Ctor =
      typeof window === 'undefined'
        ? undefined
        : (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    if (kind === 'move') tone(ctx, 220, t, 0.08, 'triangle', 0.25);
    else if (kind === 'capture') {
      tone(ctx, 140, t, 0.14, 'square', 0.18);
      tone(ctx, 90, t, 0.18, 'triangle', 0.3);
    } else {
      tone(ctx, 392, t, 0.25, 'sine', 0.25);
      tone(ctx, 330, t + 0.2, 0.25, 'sine', 0.25);
      tone(ctx, 262, t + 0.4, 0.6, 'sine', 0.25);
    }
  } catch {
    /* audio is best-effort */
  }
}

/** Vibrates on checkmate only; independent of mute (haptics aren't sound). */
export function vibrateCheckmate(
  nav: Pick<Navigator, 'vibrate'> | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator,
): boolean {
  try {
    return typeof nav?.vibrate === 'function' ? nav.vibrate(CHECKMATE_VIBRATION) : false;
  } catch {
    return false;
  }
}

/** Plays sound (and checkmate haptics) for a move just made. */
export function feedbackForMove(san: string) {
  const kind = soundForSan(san);
  playSound(kind);
  if (kind === 'gameover') vibrateCheckmate();
}

/** Draws/stalemates also get the game-over sound (no haptics). */
export function feedbackForDraw() {
  playSound('gameover');
}
