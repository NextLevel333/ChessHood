import { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Piece, pieceName } from './pieces';

export type BoardColor = 'w' | 'b';

export interface BoardProps {
  fen: string;
  lastMove: { from: string; to: string } | null;
  inCheck: boolean;
  /** Which side the local user may move right now ('both' for hot-seat, null for read-only). */
  movableColor: BoardColor | 'both' | null;
  onMove: (from: Square, to: Square, promotion?: 'q') => void;
  /** Which colour is drawn at the bottom. */
  orientation?: BoardColor;
}

const FILES = 'abcdefgh';

export function Board({
  fen,
  lastMove,
  inCheck,
  movableColor,
  onMove,
  orientation = 'w',
}: BoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn();
  const board = chess.board();
  const canMove = movableColor === 'both' || movableColor === turn;
  // Highlights only; the authority (local session or server) re-validates every move.
  const targets =
    selected && canMove ? chess.moves({ square: selected, verbose: true }).map((m) => m.to) : [];

  const click = (sq: Square, color?: BoardColor) => {
    if (!canMove) return;
    if (selected && targets.includes(sq)) {
      const piece = chess.get(selected);
      const promotes = piece?.type === 'p' && (sq[1] === '8' || sq[1] === '1');
      onMove(selected, sq, promotes ? 'q' : undefined);
      setSelected(null);
    } else if (color === turn) {
      setSelected(sq === selected ? null : sq);
    } else {
      setSelected(null);
    }
  };

  const rows = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  // Rotating the board 180° for black reverses both ranks and files, so one index order serves both.
  const cols = rows;

  return (
    <div className="board" role="group" aria-label="Chessboard">
      {rows.flatMap((r) =>
        cols.map((c) => {
          const cell = board[r][c];
          const sq = `${FILES[c]}${8 - r}` as Square;
          const dark = (r + c) % 2 === 1;
          const cls = [
            'sq',
            dark ? 'dark' : 'light',
            sq === selected ? 'sel' : '',
            targets.includes(sq) ? 'target' : '',
            lastMove && (lastMove.from === sq || lastMove.to === sq) ? 'last' : '',
            inCheck && cell?.type === 'k' && cell.color === turn ? 'check' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const label = cell ? pieceName(cell.color, cell.type) : 'empty';
          return (
            <button
              key={sq}
              type="button"
              className={cls}
              data-square={sq}
              aria-label={`${sq} ${label}`}
              onClick={() => click(sq, cell?.color)}
            >
              {cell ? <Piece color={cell.color} type={cell.type} /> : null}
            </button>
          );
        }),
      )}
    </div>
  );
}
