import { Board } from '../components/Board';
import { Sidebar } from '../components/Sidebar';
import { useGameSession } from '../game/useGameSession';

export function Practice() {
  const { session, snapshot } = useGameSession();
  const over = ['checkmate', 'stalemate', 'draw'].includes(snapshot.status);
  return (
    <section className="section">
      <h2>Practice (offline)</h2>
      <p className="note">
        Local hot-seat demo: both sides are played on this device. This is <strong>not</strong>{' '}
        online play. Use the <a href="#/lobby">lobby</a> for real-time games.
      </p>
      <div className="play">
        <Board
          fen={snapshot.fen}
          lastMove={snapshot.lastMove}
          inCheck={snapshot.inCheck}
          movableColor={over ? null : 'both'}
          onMove={(from, to, promotion) => session.move(from, to, promotion)}
        />
        <Sidebar snapshot={snapshot} onReset={() => session.reset()} />
      </div>
    </section>
  );
}
