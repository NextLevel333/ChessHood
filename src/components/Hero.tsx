export function Hero() {
  return (
    <section className="hero">
      <div className="hero-text">
        <p className="pill">Prototype • Free to play</p>
        <h1>
          Chess, but <span className="lime">hood</span> style.
        </h1>
        <p className="lead">
          Jump into a free online 1v1 or a friendly tournament. Bold board, big vibes, zero wallet
          required.
        </p>
        <div className="cta">
          <a className="btn btn-primary" href="#play">
            Play Free
          </a>
          <a className="btn btn-dark" href="#token">
            Token-Gated Arena
          </a>
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
