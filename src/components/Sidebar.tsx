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

export function MoveList({ history }: { history: string[] }) {
  const rows: [string, string | undefined][] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push([history[i], history[i + 1]]);
  }
  return (
    <>
      <h3>Moves</h3>
      <ol className="moves">
        {rows.length === 0 ? <li className="muted">No moves yet</li> : null}
        {rows.map(([w, b], i) => (
          <li key={i}>
            {i + 1}. {w} {b ?? ''}
          </li>
        ))}
      </ol>
    </>
  );
}

interface Props {
  snapshot: GameSnapshot;
  onReset: () => void;
  topLabel?: string;
  bottomLabel?: string;
  resetLabel?: string;
}

export function Sidebar({
  snapshot,
  onReset,
  topLabel = 'Black (hot-seat)',
  bottomLabel = 'White (hot-seat)',
  resetLabel = 'New game',
}: Props) {
  return (
    <aside className="sidebar card">
      <div className="player">{topLabel}</div>
      <p className="turn" role="status" aria-live="polite">
        {statusText(snapshot)}
      </p>
      <div className="player">{bottomLabel}</div>
      <MoveList history={snapshot.history} />
      <button type="button" className="btn btn-primary" onClick={onReset}>
        {resetLabel}
      </button>
    </aside>
  );
}
