import { useEffect, useState } from 'react';
import type { GameState, Role } from '@chesshood/shared';
import { useRealtime } from './useRealtime';

export interface LiveGame {
  game: GameState | null;
  role: Role | null;
  error: string | null;
  setError: (message: string | null) => void;
}

/** Joins a room on every (re)connect so reconnects resume the same seat, and mirrors server state. */
export function useLiveGame(gameId: string): LiveGame {
  const { socket, connection } = useRealtime();
  const [game, setGame] = useState<GameState | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onState = (s: GameState) => {
      if (s.id === gameId) setGame(s);
    };
    socket.on('game:state', onState);
    return () => {
      socket.off('game:state', onState);
    };
  }, [socket, gameId]);

  useEffect(() => {
    if (!socket || connection !== 'connected') return;
    socket.emit('game:join', { gameId }, (res) => {
      if (res.ok) {
        setRole(res.role);
        setGame(res.state);
        setError(null);
      } else {
        setError(res.error.message);
      }
    });
  }, [socket, connection, gameId]);

  return { game, role, error, setError };
}
