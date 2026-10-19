# ChessHood

An early prototype of an online chess platform with a playful meme-crypto look (lime / black / white).
All visuals are original; this project is not affiliated with any other brand.

> **Status:** front-end foundation only. No server, accounts, wallet, token, payments, wagers or
> prizes exist. The token is **not live yet**.

## Setup

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build
npm run lint     # ESLint
npm run format   # Prettier (format:check to verify)
npm test         # Vitest
```

Requires Node 20+.

## Deployment (GitHub Pages)

The workflow `.github/workflows/deploy-pages.yml` builds the app (`npm ci`, `npm run build`) and deploys
`dist` on every push to `main` or manual dispatch. The production build uses the base path `/ChessHood/`;
local dev uses `/`.

One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and select
**GitHub Actions**. The site is then served at `https://<owner>.github.io/ChessHood/`.

GitHub Pages hosts only the static frontend. It cannot run server code.

### Local hot-seat vs. real online multiplayer

The current game is a local hot-seat implementation: both players share one browser tab and no state
leaves it. Real online multiplayer needs a separate authoritative backend/realtime service (move
validation, matchmaking, clocks) plus persistence and authentication. GitHub Pages alone cannot provide this.

## Features

- Landing page with Play Free / Token-Gated Arena paths and a "token not live yet" status.
- Interactive local two-player chessboard (legal moves, turns, check, checkmate, stalemate/draw via
  [chess.js](https://github.com/jhlywa/chess.js)), move history, new game, player placeholders.
- Mode selector: Free 1v1 and Free Tournaments are selectable; both token-gated modes are disabled ("Coming soon").
- Mock free tournament lobby with a join/leave flow (client-side only).
- Token gate config in `src/config/tokenGate.ts`, with env template `.env.example`.

## Architecture

```
src/
  config/tokenGate.ts   # future ERC-20 gate config + validation (no chain/wallet code)
  game/session.ts       # GameSession interface + local chess.js implementation
  game/useGameSession.ts# React binding (useSyncExternalStore)
  components/           # presentational UI (Board, Sidebar, Hero, ...)
  data/modes.ts         # game modes and mock tournaments
```

UI components talk only to the `GameSession` interface. A real-time implementation (e.g. WebSocket
client with server-authoritative validation) can replace `createLocalSession` without touching the UI.

### Token gate configuration

Copy `.env.example` to `.env.local` and set the `VITE_TOKEN_*` values (feature flag, chain ID,
contract address, required balance, symbol, decimals). The gate counts as configured only when all
are valid; even then, gated modes stay locked (`GATED_MODES_AVAILABLE = false`) because wallet
verification and compliance work do not exist. The target chain is intentionally not hard-coded; confirm
requirements before adding any chain-specific integration. Note that `VITE_*` values are public in the
browser bundle, so real gating must be enforced server-side.

## Roadmap

1. **Real-time multiplayer:** server-authoritative game service, matchmaking, clocks, reconnects, spectators.
2. **Authentication:** accounts/sessions, ratings, anti-abuse and rate limiting.
3. **Wallet/token verification:** signed-message wallet login and server-side balance checks against the configured token.
4. **Tournaments:** persistent brackets, scheduling, pairing, and tie-breaks.
5. **Responsible gaming, legal and compliance review:** required before any wager, entry-fee or prize feature
   (jurisdiction/age checks, KYC/AML as applicable, terms, limits and self-exclusion).
6. **Security:** threat modelling, audits, fair-play/cheat detection, secrets handling, and no fund custody
   unless explicitly reviewed and approved.

## Limitations

Local hot-seat play only; tournaments are mock data; promotion always chooses a queen; no sounds,
draw/resign offers or clocks.
