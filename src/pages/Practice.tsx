import { useEffect, useRef, useState } from 'react';
import { Board } from '../components/Board';
import { Sidebar } from '../components/Sidebar';
import {
  chooseMove,
  DIFFICULTIES,
  DIFFICULTY_INFO,
  randomHumanColor,
  shouldCpuMove,
  type Difficulty,
} from '../game/cpu';
import type { Color } from '../game/session';
import { feedbackForDraw, feedbackForMove } from '../game/sound';
import { useGameSession } from '../game/useGameSession';

const CPU_DELAY_MIN_MS = 500;
const CPU_DELAY_MAX_MS = 1200;

function cpuDelay(): number {
  return CPU_DELAY_MIN_MS + Math.random() * (CPU_DELAY_MAX_MS - CPU_DELAY_MIN_MS);
}

interface Setup {
  difficulty: Difficulty | null; // null = local hot-seat
  humanColor: Color;
  key: number;
}

function PracticeGame({
  difficulty,
  humanColor,
  onRestart,
}: Omit<Setup, 'key'> & { onRestart: () => void }) {
  const { session, snapshot } = useGameSession();
  const cpuColor: Color | null = difficulty ? (humanColor === 'w' ? 'b' : 'w') : null;
  const thinking = !!difficulty && shouldCpuMove(snapshot, cpuColor);
  const over = ['checkmate', 'stalemate', 'draw'].includes(snapshot.status);

  // Sound/haptics once per newly played move (human or CPU).
  const seen = useRef(0);
  useEffect(() => {
    if (snapshot.history.length > seen.current) {
      const san = snapshot.history[snapshot.history.length - 1];
      if (san.includes('#')) feedbackForMove(san);
      else if (snapshot.status === 'stalemate' || snapshot.status === 'draw') feedbackForDraw();
      else feedbackForMove(san);
    }
    seen.current = snapshot.history.length;
  }, [snapshot]);

  // Schedule at most one CPU move per position; the fen is re-checked when the timer fires.
  useEffect(() => {
    if (!difficulty || !shouldCpuMove(snapshot, cpuColor)) return;
    const fen = snapshot.fen;
    const timer = setTimeout(() => {
      if (session.getSnapshot().fen === fen) {
        const m = chooseMove(fen, difficulty);
        if (m)
          session.move(m.from, m.to, (m.promotion as 'q' | 'r' | 'b' | 'n' | undefined) ?? 'q');
      }
    }, cpuDelay());
    return () => clearTimeout(timer);
  }, [snapshot, difficulty, cpuColor, session]);

  const movable = over || thinking ? null : cpuColor ? humanColor : 'both';
  const cpuName = difficulty ? `CPU (${DIFFICULTY_INFO[difficulty].label})` : null;
  const youName = (c: Color) => `${c === 'w' ? 'White' : 'Black'} (you)`;
  const cpuLabel = (c: Color) => `${c === 'w' ? 'White' : 'Black'} — ${cpuName}`;
  const label = (c: Color) =>
    !cpuColor
      ? `${c === 'w' ? 'White' : 'Black'} (hot-seat)`
      : c === cpuColor
        ? cpuLabel(c)
        : youName(c);
  const bottom: Color = cpuColor ? humanColor : 'w';
  const top: Color = bottom === 'w' ? 'b' : 'w';

  return (
    <>
      {difficulty ? (
        <p className="note" role="status">
          Playing {humanColor === 'w' ? 'White' : 'Black'} against {cpuName}.{' '}
          {thinking ? 'CPU is thinking…' : ''}
        </p>
      ) : null}
      <div className="play">
        <Board
          fen={snapshot.fen}
          lastMove={snapshot.lastMove}
          inCheck={snapshot.inCheck}
          movableColor={movable}
          orientation={bottom}
          onMove={(from, to, promotion) => {
            if (!thinking) session.move(from, to, promotion);
          }}
        />
        <Sidebar
          snapshot={snapshot}
          topLabel={label(top)}
          bottomLabel={label(bottom)}
          resetLabel={difficulty ? 'New game (new random colour)' : 'New game'}
          onReset={onRestart}
        />
      </div>
    </>
  );
}

export function Practice() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const start = (difficulty: Difficulty | null) =>
    setSetup((prev) => ({
      difficulty,
      humanColor: difficulty ? randomHumanColor() : 'w',
      key: (prev?.key ?? 0) + 1,
    }));

  return (
    <section className="section">
      <h2>Free play</h2>
      <p className="note">
        Play the CPU or a local hot-seat game on this device. This is <strong>not</strong> online
        play. Use the <a href="#/lobby">lobby</a> for real-time games. Your colour is random each
        time you start a CPU game.
      </p>
      <div className="cpu-menu" role="group" aria-label="Choose opponent">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            className={`btn ${setup?.difficulty === d ? 'btn-primary' : 'btn-dark'}`}
            title={DIFFICULTY_INFO[d].blurb}
            aria-pressed={setup?.difficulty === d}
            onClick={() => start(d)}
          >
            CPU: {DIFFICULTY_INFO[d].label}
          </button>
        ))}
        <button
          type="button"
          className={`btn ${setup && setup.difficulty === null ? 'btn-primary' : 'btn-dark'}`}
          onClick={() => start(null)}
        >
          Two players (hot-seat)
        </button>
      </div>
      {setup ? (
        <PracticeGame
          key={setup.key}
          difficulty={setup.difficulty}
          humanColor={setup.humanColor}
          onRestart={() => start(setup.difficulty)}
        />
      ) : (
        <p className="note">Pick an opponent to start.</p>
      )}
    </section>
  );
}
