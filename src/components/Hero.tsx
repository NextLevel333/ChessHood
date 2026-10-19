import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-text">
        <p className="pill">Research prototype • Free to play</p>
        <h1>
          Chess, but <span className="lime">hood</span> style.
        </h1>
        <p className="lead">
          Create a private room, share the link and play a real-time 1v1 with a friend.
          Server-checked moves, bold board, zero wallet required.
        </p>
        <div className="cta">
          <Link className="btn btn-primary" to="/lobby">
            Play online
          </Link>
          <Link className="btn btn-dark" to="/practice">
            Play the CPU
          </Link>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="float f1">♞</span>
        <span className="float f2">♛</span>
        <span className="float f3">♜</span>
        <span className="float f4">♟</span>
      </div>
    </section>
  );
}
