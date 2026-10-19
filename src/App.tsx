import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RealtimeProvider } from './net/RealtimeProvider';
import { Game } from './pages/Game';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { Practice } from './pages/Practice';

/** Hash routing keeps deep links working on GitHub Pages, which cannot rewrite unknown paths. */
export default function App() {
  return (
    <HashRouter>
      <RealtimeProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="lobby" element={<Lobby />} />
            <Route path="game/:gameId" element={<Game />} />
            <Route path="practice" element={<Practice />} />
            <Route path="*" element={<Landing />} />
          </Route>
        </Routes>
      </RealtimeProvider>
    </HashRouter>
  );
}
