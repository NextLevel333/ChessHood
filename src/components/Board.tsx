import { useState } from 'react';
import { Chess, type Square } from 'chess.js';
import type { GameSession, GameSnapshot } from '../game/session';

const GLYPHS: Record<string, string> = {
  wk: '♔',
  wq: '♕',
  wr: '♖',
  wb: '♗',
  wn: '♘',
  wp: '♙',
  bk: '♚',
  bq: '♛',
  br: '♜',
  bb: '♝',
  bn: '♞',
  bp: '♟',
};
const FILES = 'abcdefgh';

interface Props {
  session: GameSession;
  snapshot: GameSnapshot;
}

export function Board({ session, snapshot }: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const board = new Chess(snapshot.fen).board();
  const over =
    snapshot.status === 'checkmate' ||
    snapshot.status === 'stalemate' ||
    snapshot.status === 'draw';
  const targets = selected ? session.legalTargets(selected) : [];

  const click = (sq: Square, color?: string) => {
    if (over) return;
    if (selected && targets.includes(sq)) {
      session.move(selected, sq);
      setSelected(null);
    } else if (color === snapshot.turn) {
      setSelected(sq === selected ? null : sq);
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="board" role="group" aria-label="Chessboard">
      {board.flatMap((row, r) =>
        row.map((cell, c) => {
          const sq = `${FILES[c]}${8 - r}` as Square;
          const dark = (r + c) % 2 === 1;
          const cls = [
            'sq',
            dark ? 'dark' : 'light',
            sq === selected ? 'sel' : '',
            targets.includes(sq) ? 'target' : '',
            snapshot.lastMove && (snapshot.lastMove.from === sq || snapshot.lastMove.to === sq)
              ? 'last'
              : '',
            snapshot.inCheck && cell?.type === 'k' && cell.color === snapshot.turn ? 'check' : '',
          ].join(' ');
          const label = cell ? `${cell.color === 'w' ? 'White' : 'Black'} ${cell.type}` : 'empty';
          return (
            <button
              key={sq}
              type="button"
              className={cls}
              aria-label={`${sq} ${label}`}
              onClick={() => click(sq, cell?.color)}
            >
              {cell ? (
                <span className={`piece ${cell.color}`}>{GLYPHS[cell.color + cell.type]}</span>
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}
