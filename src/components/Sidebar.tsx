import type { GameSnapshot } from '../game/session';

export function statusText(s: GameSnapshot): string {
  const side = s.turn === 'w' ? 'White' : 'Black';
  switch (s.status) {
    case 'checkmate':
      return `Checkmate! ${s.winner === 'w' ? 'White' : 'Black'} wins.`;
    case 'stalemate':
      return 'Stalemate — draw.';
    case 'draw':
      return 'Draw.';
    case 'check':
      return `${side} to move — check!`;
    default:
      return `${side} to move`;
  }
}

interface Props {
  snapshot: GameSnapshot;
  onReset: () => void;
}

export function Sidebar({ snapshot, onReset }: Props) {
  const rows: [string, string | undefined][] = [];
  for (let i = 0; i < snapshot.history.length; i += 2) {
    rows.push([snapshot.history[i], snapshot.history[i + 1]]);
  }
  return (
    <aside className="sidebar card">
      <div className="player">
        ♚ Player 2 (Black) <span className="muted">— placeholder</span>
      </div>
      <p className="turn" role="status" aria-live="polite">
        {statusText(snapshot)}
      </p>
      <div className="player">
        ♔ Player 1 (White) <span className="muted">— placeholder</span>
      </div>
      <h3>Moves</h3>
      <ol className="moves">
        {rows.length === 0 ? <li className="muted">No moves yet</li> : null}
        {rows.map(([w, b], i) => (
          <li key={i}>
            {i + 1}. {w} {b ?? ''}
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-primary" onClick={onReset}>
        New game
      </button>
    </aside>
  );
}
