import { useState } from 'react';
import { MOCK_TOURNAMENTS } from '../data/modes';

export function TournamentLobby() {
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setJoined((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="tournaments" className="section">
      <h2>Free Tournament Lobby</h2>
      <p className="note">
        Mock data for the prototype. Free tournaments only; no entry fees or prizes.
      </p>
      <div className="grid">
        {MOCK_TOURNAMENTS.map((t) => {
          const isIn = joined.has(t.id);
          return (
            <article key={t.id} className="card">
              <h3>{t.name}</h3>
              <p>{t.format}</p>
              <p className="muted">
                Starts in {t.startsIn} • {t.joined + (isIn ? 1 : 0)}/{t.capacity} players
              </p>
              <button
                type="button"
                className={`btn ${isIn ? 'btn-dark' : 'btn-primary'}`}
                onClick={() => toggle(t.id)}
              >
                {isIn ? 'Leave room' : 'Join free'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
