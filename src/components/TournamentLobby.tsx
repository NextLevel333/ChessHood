import { MOCK_TOURNAMENTS } from '../data/modes';

export function TournamentLobby() {
  return (
    <section id="tournaments" className="section">
      <h2>Tournaments (planned)</h2>
      <p className="note">
        Preview only — tournaments are not implemented and these rooms are sample data. Free
        tournaments only; no entry fees or prizes.
      </p>
      <div className="grid">
        {MOCK_TOURNAMENTS.map((t) => (
          <article key={t.id} className="card">
            <h3>{t.name}</h3>
            <p>{t.format}</p>
            <p className="muted">Sample: {t.capacity} players</p>
            <button type="button" className="btn btn-dark" disabled>
              Coming soon
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
