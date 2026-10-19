import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackendBanner } from '../components/BackendBanner';
import { GatePanel } from '../components/GatePanel';
import { parseGameId } from '../net/gameId';
import { useRealtime } from '../net/useRealtime';

export function Lobby() {
  const { backend, connection, socket, gate, session } = useRealtime();
  const navigate = useNavigate();
  const [arena, setArena] = useState(false);
  const [code, setCode] = useState('');
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = backend === 'online' && connection === 'connected' && !!socket;
  const arenaAvailable = !!gate?.enabled;

  useEffect(() => {
    if (!socket) return;
    const onMatched = ({ gameId }: { gameId: string }) => navigate(`/game/${gameId}`);
    socket.on('queue:matched', onMatched);
    return () => {
      setQueued(false);
      socket.off('queue:matched', onMatched);
      socket.emit('queue:leave', () => undefined);
    };
  }, [socket, navigate]);

  const create = () => {
    setError(null);
    socket?.emit('game:create', { arena: arena && arenaAvailable }, (res) => {
      if (res.ok) navigate(`/game/${res.state.id}`);
      else setError(res.error.message);
    });
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const id = parseGameId(code);
    if (!id) return setError('Enter a valid room code or invite link.');
    setError(null);
    navigate(`/game/${id}`);
  };

  const quickMatch = () => {
    setError(null);
    socket?.emit('queue:join', (res) => {
      if (!res.ok) return setError(res.error.message);
      if (res.gameId) navigate(`/game/${res.gameId}`);
      else setQueued(true);
    });
  };

  const cancelQueue = () => {
    socket?.emit('queue:leave', () => setQueued(false));
  };

  return (
    <section className="section">
      <h2>Lobby</h2>
      <BackendBanner />
      {session ? <p className="muted">Playing as guest “{session.name}”.</p> : null}
      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid">
        <article className="card">
          <h3>Private room</h3>
          <p>Create a room and send the link to a friend. You play white.</p>
          {arenaAvailable ? (
            <label className="check">
              <input type="checkbox" checked={arena} onChange={(e) => setArena(e.target.checked)} />{' '}
              Test arena (testnet token required)
            </label>
          ) : null}
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={create}>
            Create room
          </button>
        </article>
        <article className="card">
          <h3>Join by code or link</h3>
          <form onSubmit={join} className="join-form">
            <input
              aria-label="Room code or invite link"
              placeholder="ABCD2345 or invite link"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!ready}
            />
            <button type="submit" className="btn btn-dark" disabled={!ready}>
              Join
            </button>
          </form>
        </article>
        <article className="card">
          <h3>Quick match</h3>
          <p>Get paired with the next player in the queue.</p>
          {queued ? (
            <button type="button" className="btn btn-dark" onClick={cancelQueue}>
              Searching… cancel
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ready}
              onClick={quickMatch}
            >
              Find opponent
            </button>
          )}
        </article>
      </div>
      <GatePanel />
    </section>
  );
}
