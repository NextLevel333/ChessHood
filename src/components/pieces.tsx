import type { ReactElement } from 'react';

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

/** Solid silhouettes drawn on a 45x45 grid. Fill/outline come from CSS (`.piece-w` / `.piece-b`). */
const SHAPES: Record<PieceType, ReactElement> = {
  p: (
    <>
      <circle cx="22.5" cy="12.5" r="6" />
      <path d="M15.5 33c0-7 3-10.500 7-13 4 2.500 7 6 7 13z" />
      <path d="M11 39v-5h23v5z" />
    </>
  ),
  r: (
    <>
      <path d="M11 8h5v3.500h4V8h5v3.500h4V8h5v10H11z" />
      <path d="M14 18h17l1.500 14h-20z" />
      <path d="M10 39v-4.500h25V39z" />
      <path d="M12 34.500V32h21v2.500z" />
    </>
  ),
  n: (
    <>
      <path d="M11.500 39c0-9 1.500-15 8-19.500l-3.500-3 1.500-5 5-4.500 1.500-3 3.500 3c8 3 10.500 12 10 32z" />
      <circle className="cut-fill" cx="22" cy="14" r="1.400" />
      <path className="cut" d="M14.500 24.500c2-1 3.500-2.500 4-4.500" />
    </>
  ),
  b: (
    <>
      <circle cx="22.500" cy="6.500" r="2.800" />
      <path d="M22.500 9c-6 4-7 9-6 13h12c1-4 0-9-6-13z" />
      <path className="cut" d="M22.500 13v6M19.500 16h6" />
      <path d="M17 22h11l3.500 12h-18z" />
      <path d="M10 39v-4.500h25V39z" />
    </>
  ),
  q: (
    <>
      <circle cx="8.500" cy="12.500" r="2.800" />
      <circle cx="16" cy="8.500" r="2.800" />
      <circle cx="22.500" cy="7" r="2.800" />
      <circle cx="29" cy="8.500" r="2.800" />
      <circle cx="36.500" cy="12.500" r="2.800" />
      <path d="M8.500 14.500l5 17 3.500-18 5.500 17 5.500-17 3.500 18 5-17-2.500 23.500h-23z" />
      <path d="M10 39v-4h25v4z" />
    </>
  ),
  k: (
    <>
      <path d="M20.500 2.500h4v4h4v4h-4v4h-4v-4h-4v-4h4z" />
      <path d="M22.500 15c-9 2-13 9-11 20h22c2-11-2-18-11-20z" />
      <path d="M10 39v-4.500h25V39z" />
      <path className="cut" d="M14.500 28h16" />
    </>
  ),
};

interface Props {
  color: PieceColor;
  type: PieceType;
}

export function Piece({ color, type }: Props) {
  return (
    <svg
      className={`piece-svg piece-${color}`}
      viewBox="0 0 45 45"
      role="img"
      aria-label={pieceName(color, type)}
      focusable="false"
    >
      {SHAPES[type]}
    </svg>
  );
}
