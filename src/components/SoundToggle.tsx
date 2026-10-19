import { setMuted, useMuted } from '../game/sound';

export function SoundToggle() {
  const muted = useMuted();
  const label = muted ? 'Unmute sound effects' : 'Mute sound effects';
  return (
    <button
      type="button"
      className="sound-toggle"
      title={label}
      aria-label={label}
      aria-pressed={muted}
      onClick={() => setMuted(!muted)}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}
