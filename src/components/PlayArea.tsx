import { useGameSession } from '../game/useGameSession';
import { Board } from './Board';
import { Sidebar } from './Sidebar';

export function PlayArea() {
  const { session, snapshot } = useGameSession();
  return (
    <div className="play">
      <Board session={session} snapshot={snapshot} />
      <Sidebar snapshot={snapshot} onReset={() => session.reset()} />
    </div>
  );
}
