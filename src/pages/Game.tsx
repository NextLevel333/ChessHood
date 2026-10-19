import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GameState } from '@chesshood/shared';
import { BackendBanner } from '../components/BackendBanner';
import { Board } from '../components/Board';
import { MoveList } from '../components/Sidebar';
import { useLiveGame } from '../net/useLiveGame';
import { useRealtime } from '../net/useRealtime';

function statusLine(g: GameState, role: string | null): string {
  const side = g.turn === 'w' ? 'White' : 'Black';
  const name = (c: 'w' | 'b') => (c === 'w' ? 'White' : 'Black');
  switch (g.status) {
    case 'waiting':
      return 'Waiting for an opponent to join…';
    case 'checkmate':
      return `Checkmate! ${name(g.winner!)} wins.`;
    case 'resigned':
      return `${name(g.winner === 'w' ? 'b' : 'w')} resigned. ${name(g.winner!)} wins.`;
    case 'stalemate':
      return 'Stalemate — draw.';
    case 'draw':
      return 'Draw.';
    default:
      if (role === g.turn) return g.inCheck ? 'Your move — check!' : 'Your move';
      return `${side} to move${g.inCheck ? ' — check!' : ''}`;
  }
}

export function Game() {
  const { gameId = '' } = useParams();
  const { connection, backend, socket } = useRealtime();
  const { game, role, error, setError } = useLiveGame(gameId);
  const [copied, setCopied] = useState(false);

  const seat = role === 'w' || role === 'b' ? role : null;
  const isPlayer = seat !== null;
  const active = game?.status === 'active';
  const over = !!game && !['waiting', 'active'].includes(game.status);

  const ack = (res: { ok: boolean; error?: { message: string } }) => {
    if (!res.ok) setError(res.error?.message ?? 'Request failed.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy; copy the address bar link instead.');
    }
  };

  return (
    <section className="section">
      <h2>
        Game <code>{gameId.toUpperCase()}</code>
        {game?.arena ? <span className="badge badge-warn arena-tag">Testnet arena</span> : null}
      </h2>
      <BackendBanner />
      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}{' '}
          <Link className="link-btn" to="/lobby">
            Back to lobby
          </Link>
        </p>
      ) : null}
      {!game && backend === 'online' && !error ? <p>Joining room…</p> : null}
      {game ? (
        <div className="play">
          <Board
            fen={game.fen}
            lastMove={game.lastMove}
            inCheck={game.inCheck}
            orientation={role === 'b' ? 'b' : 'w'}
            movableColor={seat && active && connection === 'connected' ? seat : null}
            onMove={(from, to, promotion) =>
              socket?.emit('game:move', { gameId: game.id, from, to, promotion }, ack)
            }
          />
          <aside className="sidebar card">
            {(['b', 'w'] as const).map((c) => {
              const p = game.players[c];
              return (
                <div className="player" key={c}>
                  <span className={`dot ${p?.connected ? 'on' : 'off'}`} aria-hidden="true" />
                  {c === 'w' ? 'White' : 'Black'}: {p ? p.name : 'waiting…'}
                  {role === c ? ' (you)' : ''}
                  {p && !p.connected ? <span className="muted"> — disconnected</span> : null}
                </div>
              );
            })}
            <p className="turn" role="status" aria-live="polite">
              {statusLine(game, role)}
            </p>
            <p className="muted">
              {role === 'spectator' ? 'Spectating (read-only). ' : ''}Connection: {connection}
            </p>
            {game.status === 'waiting' ? (
              <button type="button" className="btn btn-dark" onClick={copy}>
                {copied ? 'Link copied!' : 'Copy invite link'}
              </button>
            ) : null}
            <MoveList history={game.history} />
            {isPlayer && active ? (
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => socket?.emit('game:resign', { gameId: game.id }, ack)}
              >
                Resign
              </button>
            ) : null}
            {isPlayer && over ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!!seat && game.rematch[seat]}
                onClick={() => socket?.emit('game:rematch', { gameId: game.id }, ack)}
              >
                {seat && game.rematch[seat]
                  ? 'Waiting for opponent…'
                  : game.rematch[seat === 'w' ? 'b' : 'w']
                    ? 'Accept rematch'
                    : 'Rematch (swap colours)'}
              </button>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
