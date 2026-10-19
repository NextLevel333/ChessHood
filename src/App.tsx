import { useState } from 'react';
import { GAME_MODES, type GameMode } from './data/modes';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { TokenStatus } from './components/TokenStatus';
import { ModeSelector } from './components/ModeSelector';
import { PlayArea } from './components/PlayArea';
import { TournamentLobby } from './components/TournamentLobby';

export default function App() {
  const [mode, setMode] = useState<GameMode>(GAME_MODES[0]);

  return (
    <>
      <header className="nav">
        <a className="logo" href="#top">
          <span aria-hidden="true">♞</span> ChessHood
        </a>
        <nav aria-label="Main">
          <a href="#play">Play</a>
          <a href="#tournaments">Tournaments</a>
          <a href="#token">Token</a>
        </nav>
      </header>
      <main id="top">
        <Hero />
        <Features />
        <section id="play" className="section">
          <h2>Play</h2>
          <ModeSelector selected={mode.id} onSelect={setMode} />
          {mode.id === 'free-tournament' ? (
            <p className="note">
              Tournament rooms are below. Meanwhile, practice on the local board.
            </p>
          ) : null}
          <PlayArea />
        </section>
        <TournamentLobby />
        <TokenStatus />
      </main>
      <footer className="footer">
        <p>
          ChessHood is an early prototype. No token is live, and nothing here offers financial
          returns or guaranteed winnings.
        </p>
      </footer>
    </>
  );
}
