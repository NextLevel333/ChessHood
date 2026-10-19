import { Link, NavLink, Outlet } from 'react-router-dom';
import { SoundToggle } from './SoundToggle';

export function Layout() {
  return (
    <>
      <header className="nav">
        <Link className="logo" to="/">
          <span aria-hidden="true">♞</span> ChessHood
        </Link>
        <nav aria-label="Main">
          <NavLink to="/lobby">Lobby</NavLink>
          <NavLink to="/practice">Free play</NavLink>
        </nav>
        <SoundToggle />
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          ChessHood is a private research prototype. Any token gate is testnet-only; nothing here
          offers payments, wagers, prizes or financial returns.
        </p>
      </footer>
    </>
  );
}
