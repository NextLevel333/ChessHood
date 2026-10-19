import { GAME_MODES, type GameMode } from '../data/modes';

interface Props {
  selected: GameMode['id'];
  onSelect: (mode: GameMode) => void;
}

export function ModeSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid modes" role="group" aria-label="Game mode">
      {GAME_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={selected === m.id}
          disabled={m.gated}
          className={`card mode ${selected === m.id ? 'selected' : ''}`}
          onClick={() => onSelect(m)}
        >
          <strong>{m.name}</strong>
          <span>{m.blurb}</span>
          {m.gated ? <span className="badge badge-warn">Coming soon</span> : null}
        </button>
      ))}
    </div>
  );
}
