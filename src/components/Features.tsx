const items = [
  {
    icon: '♟',
    title: 'Free 1v1',
    text: 'Create a private room or join the quick-match queue. No sign-up wall, no token needed.',
  },
  { icon: '♜', title: 'Tournaments', text: 'Planned: free knockout rooms. Not available yet.' },
  {
    icon: '♛',
    title: 'Testnet access gate (experimental)',
    text: 'Optional, server-verified ERC-20 test-arena access on a testnet only. Off unless the server enables it.',
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
