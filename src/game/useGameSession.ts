import { useMemo, useSyncExternalStore } from 'react';
import { createLocalSession, type GameSession, type GameSnapshot } from './session';

export function useGameSession(): { session: GameSession; snapshot: GameSnapshot } {
  const session = useMemo(() => createLocalSession(), []);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  return { session, snapshot };
}
