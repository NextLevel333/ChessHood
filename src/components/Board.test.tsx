import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Board } from './Board';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const noop = () => undefined;

function render(orientation: 'w' | 'b' = 'w') {
  return renderToStaticMarkup(
    <Board
      fen={START}
      lastMove={null}
      inCheck={false}
      movableColor="both"
      onMove={noop}
      orientation={orientation}
    />,
  );
}

describe('Board', () => {
  it('renders 64 equal squares, 32 solid SVG pieces and no Unicode glyphs', () => {
    const html = render();
    expect(html.match(/class="sq /g)).toHaveLength(64);
    expect(html.match(/<svg/g)).toHaveLength(32);
    expect(html).not.toMatch(/[\u2654-\u265F]/);
  });

  it('labels pieces and empty squares accessibly', () => {
    const html = render();
    expect(html).toContain('aria-label="e1 White king"');
    expect(html).toContain('aria-label="d8 Black queen"');
    expect(html).toContain('aria-label="e4 empty"');
    expect(html).toContain('role="img" aria-label="Black knight"');
  });

  it('flips orientation for black', () => {
    expect(render('w').indexOf('data-square="a8"')).toBeLessThan(
      render('w').indexOf('data-square="a1"'),
    );
    expect(render('b').indexOf('data-square="h1"')).toBeLessThan(
      render('b').indexOf('data-square="h8"'),
    );
  });
});

describe('board styles', () => {
  const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');

  it('uses a stable 8x8 grid with square cells', () => {
    expect(css).toContain('grid-template-columns: repeat(8, minmax(0, 1fr))');
    expect(css).toContain('grid-template-rows: repeat(8, minmax(0, 1fr))');
    const sq = css.slice(css.indexOf('.sq {'), css.indexOf('}', css.indexOf('.sq {')));
    expect(sq).toContain('aspect-ratio: 1 / 1');
    expect(sq).toContain('min-width: 0');
    expect(sq).toContain('min-height: 0');
  });
});
