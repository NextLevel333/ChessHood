export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

const NAMES: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export function pieceName(color: PieceColor, type: PieceType): string {
  return `${color === 'w' ? 'White' : 'Black'} ${NAMES[type]}`;
}

/** Same solid glyphs as the landing page's floating pieces (U+FE0E forces text, not emoji, rendering). */
const GLYPHS: Record<PieceType, string> = {
  p: '\u265F\uFE0E',
  r: '\u265C',
  n: '\u265E',
  b: '\u265D',
  q: '\u265B',
  k: '\u265A',
};

interface Props {
  color: PieceColor;
  type: PieceType;
}

export function Piece({ color, type }: Props) {
  return (
    <span className={`piece-glyph piece-${color}`} role="img" aria-label={pieceName(color, type)}>
      {GLYPHS[type]}
    </span>
  );
}
