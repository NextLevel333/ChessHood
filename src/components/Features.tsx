const items = [
  { icon: '♟', title: 'Free 1v1', text: 'Pick a game and play. No sign-up wall, no token needed.' },
  { icon: '♜', title: 'Tournaments', text: 'Free knockout rooms with a simple join flow.' },
  {
    icon: '♛',
    title: 'Token-gated access (future)',
    text: 'An optional ERC-20 holder area is planned, but it is not available yet.',
  },
];

export function Features() {
  return (
    <section className="section">
      <h2>How it works</h2>
      <div className="grid">
        {items.map((i) => (
          <article key={i.title} className="card">
            <div className="icon" aria-hidden="true">
              {i.icon}
            </div>
            <h3>{i.title}</h3>
            <p>{i.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
