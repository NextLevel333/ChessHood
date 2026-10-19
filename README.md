# ChessHood

A private **research prototype** of a real-time multiplayer chess app with a playful lime / black / white
look. All visuals are original; this project is not affiliated with any other brand.

> **Status:** working MVP for experiments with friends. Rooms live in **server memory only** (no database).
> The optional token gate is **TESTNET / EXPERIMENTAL ONLY**. There are no payments, wagers, prizes,
> custody or mainnet token features, and none will be added without legal/compliance review.

## Architecture

```
 Browser (GitHub Pages, static)                 Backend (Node host with WebSockets)
┌──────────────────────────────┐   HTTPS      ┌────────────────────────────────────┐
│ React + Vite + HashRouter    │ ───────────▶ │ Express: /health, /api/guest,      │
│  /           landing         │              │          /api/gate/*               │
│  /lobby      rooms, queue    │   Socket.IO  │ Socket.IO: game:*, queue:*         │
│  /game/:id   live board      │ ◀──────────▶ │ RoomManager (chess.js, in-memory)  │
│  /practice   OFFLINE hot-seat│              │ GuestAuthenticator (HMAC tokens)   │
│ viem: wallet signs a message │              │ TestnetGate (viem: verify + RPC)   │
└──────────────────────────────┘              └──────────────┬─────────────────────┘
        shared/ = protocol types                             │ server-side RPC only
                                                             ▼ testnet ERC-20 balanceOf
```

Workspaces: `./` (frontend), `server/` (`@chesshood/server`), `shared/` (`@chesshood/shared`, event payload
types used by both sides). The server owns all game state: clients send only `{from, to, promotion}`; the
server checks seat, turn and legality with `chess.js` and broadcasts the resulting state. Client-supplied
FEN/result/colour is never read.

Routes use `HashRouter` (`https://<user>.github.io/ChessHood/#/game/ABCD2345`) because GitHub Pages cannot
rewrite deep links; refreshes never render a blank page.

## Local setup

Requires **Node 22+**.

```bash
npm install
cp .env.example .env.local          # frontend (public) values
cp .env.example server/.env         # then keep only the backend section you need
npm run dev:all                     # frontend :5173 + backend :3001
```

Separate commands: `npm run dev` (frontend), `npm run dev:server` (backend). Open two browsers (or one
normal + one private window), create a room in `/lobby`, and open the invite link in the other.

Checks: `npm run lint`, `npm run typecheck`, `npm test` (or `npm run check` for all), `npm run build`.

## Environment variables

See `.env.example`, which separates **public** `VITE_*` values from **server-only** values.

| Where    | Variable                                 | Purpose                                                    |
| -------- | ---------------------------------------- | ---------------------------------------------------------- |
| Frontend | `VITE_API_URL`, `VITE_SOCKET_URL`        | Backend URLs (`VITE_SOCKET_URL` defaults to the API URL)   |
| Frontend | `VITE_BASE`                              | Vite base, default `/ChessHood/`                           |
| Server   | `PORT`, `CORS_ORIGINS`, `SESSION_SECRET` | Port, exact allowed origins (no `*`), token-signing secret |
| Server   | `TESTNET_*`                              | Optional testnet gate (below)                              |

## Deployment

- **Frontend (GitHub Pages):** `.github/workflows/deploy-pages.yml` lints, typechecks, tests, builds and
  deploys `dist` on pushes to `main`. In **Settings → Pages** choose **GitHub Actions**. Set repository
  **Variables** `VITE_API_URL` (and optionally `VITE_SOCKET_URL`) to your backend's public HTTPS URL. Without
  them the lobby clearly shows _"Online play unavailable"_ and only offline practice works.
- **Backend:** deploy `server/` to any host that supports long-lived WebSocket connections (Render, Fly.io,
  Railway, a VPS…) as a **single instance**: `npm ci && npm run start:server`, `NODE_ENV=production`,
  `SESSION_SECRET` (`openssl rand -hex 32`) and `TRUST_PROXY_HOPS=1` behind a proxy, `CORS_ORIGINS=https://<user>.github.io` (origin only; the
  server refuses to start in production without these, and rejects wildcards). Serve it over HTTPS/WSS.

## Testnet ERC-20 access gate (experimental)

Disabled by default; free private play never needs it. To try it, set on the **server**:
`TESTNET_GATE_ENABLED=true`, `TESTNET_CHAIN_ID`, `TESTNET_RPC_URL`, `TESTNET_TOKEN_ADDRESS`,
`TESTNET_REQUIRED_BALANCE` (plus optional symbol/decimals/scope). Flow: wallet connects in the browser →
server issues a single-use, 5-minute challenge → wallet **signs** it (no transaction, no gas) → server
verifies the signature and reads `balanceOf` via its own RPC → access is held server-side for one hour per
guest session. `TESTNET_GATE_SCOPE=arena` protects only "test arena" rooms; `all` protects create/join and
quick match. Access is checked when creating/joining rooms and queueing, not on every move, so a game
in progress is not interrupted if access expires.

Security constraints:

- Authorization is decided only by the server. The browser shows status but cannot grant access.
- No secrets in `VITE_*`. The RPC URL, which may embed an API key, is server-only and never exposed.
- Known mainnet chain IDs are **always rejected**. Only a built-in testnet list is accepted (Sepolia,
  Holesky, Base/Arbitrum/OP Sepolia, Polygon Amoy, BNB testnet). A developer who has verified another network
  is a testnet must opt in with `TESTNET_EXTRA_CHAIN_IDS=<id>`.
- Use throwaway wallets. Invalid configuration (when enabled) stops the server at startup.
- Signature verification supports externally-owned accounts only (no ERC-1271 smart-contract wallets).

## Features

- Landing page (`/`), lobby (`/lobby`: private room, join by code/link, quick-match queue), live game
  (`/game/:id`: board, players, presence, connection state, resign, rematch with colour swap, invite link).
- Practice (`/practice`): explicitly **offline** local hot-seat mode.
- Solid, high-contrast SVG pieces and fixed equal-size 8×8 squares on both boards.
- Server tests (rooms, turn/legality enforcement, config validation, gate signature/balance logic, Socket.IO
  integration) and UI tests (board rendering/labels/CSS rules).

## Limitations

In-memory state (restart = all games lost), single instance, guest identities only, no clocks, draw offers,
spectator chat or persistence, promotion always queens, tournaments are a non-functional preview. Manual
verification of the wallet flow needs a browser wallet plus a real testnet token and RPC, which automated
tests replace with a signed-message/mock-RPC unit test.

## Production hardening roadmap

1. **PostgreSQL:** users, games, move history, ratings, tournaments; reload active games on restart.
2. **Redis:** pub/sub (Socket.IO adapter) for multiple instances, presence, matchmaking queue, shared rate limits.
3. **Authentication:** replace `GuestAuthenticator` (see `server/src/auth.ts`) with OAuth/passwordless login;
   add per-IP/per-user rate limits and abuse controls.
4. **Clocks & fair play:** server-managed time controls, timeouts, draw offers, anti-cheat review, moderation.
5. **Operations:** structured logging, metrics/alerting, backups, secret management, security review.
6. **Compliance:** any wager, entry fee, prize or mainnet token requires legal review first and is out of scope.
