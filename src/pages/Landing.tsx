import { Link } from 'react-router-dom';
import { Features } from '../components/Features';
import { Hero } from '../components/Hero';
import { TestnetBadge } from '../components/GatePanel';
import { TournamentLobby } from '../components/TournamentLobby';

export function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <section className="section">
        <h2>Where to play</h2>
        <div className="grid">
          <article className="card">
            <h3>Online lobby</h3>
            <p>Private rooms, invite links and quick match with a server-authoritative board.</p>
            <Link className="btn btn-primary" to="/lobby">
              Open the lobby
            </Link>
          </article>
          <article className="card">
            <h3>Free play (vs CPU)</h3>
            <p>
              Play a CPU (Easy, Intermediate or Hard) with a random colour, or a local hot-seat
              board. Not online play.
            </p>
            <Link className="btn btn-dark" to="/practice">
              Open free play
            </Link>
          </article>
        </div>
      </section>
      <TournamentLobby />
      <section className="section">
        <h2>Testnet access gate</h2>
        <TestnetBadge />
        <p>
          For private experiments, the server can require a signed message and a minimum ERC-20
          balance on a test network. It is disabled by default, free play never needs it, and there
          are no payments, wagers or prizes. Details live in the lobby.
        </p>
      </section>
    </>
  );
}
