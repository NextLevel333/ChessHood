/**
 * Wire protocol shared by the ChessHood frontend and backend.
 * Types only (plus small constants) so there is one source of truth for event payloads.
 */

export type Color = 'w' | 'b';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export type GameStatus = 'waiting' | 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';

export interface PlayerInfo {
  id: string;
  name: string;
  connected: boolean;
}

/** Full server-authoritative game state broadcast to every participant. */
export interface GameState {
  id: string;
  fen: string;
  turn: Color;
  status: GameStatus;
  /** Winning colour for checkmate/resignation, otherwise null. */
  winner: Color | null;
  inCheck: boolean;
  /** SAN move history. */
  history: string[];
  lastMove: { from: string; to: string } | null;
  players: { w: PlayerInfo | null; b: PlayerInfo | null };
  /** Token-gated (testnet research) arena room. */
  arena: boolean;
  /** Increments with every rematch. */
  round: number;
  rematch: { w: boolean; b: boolean };
}

export type Role = Color | 'spectator';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'GAME_NOT_FOUND'
  | 'GAME_FULL'
  | 'NOT_A_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'GAME_NOT_ACTIVE'
  | 'ILLEGAL_MOVE'
  | 'ALREADY_QUEUED'
  | 'GATE_REQUIRED'
  | 'SERVER_FULL';

export interface ProtocolError {
  code: ErrorCode;
  message: string;
}

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: ProtocolError };

export interface JoinResult {
  role: Role;
  state: GameState;
}

export interface ClientToServerEvents {
  'game:create': (req: { arena?: boolean }, ack: (res: Ack<JoinResult>) => void) => void;
  'game:join': (req: { gameId: string }, ack: (res: Ack<JoinResult>) => void) => void;
  'game:move': (
    req: { gameId: string; from: string; to: string; promotion?: PromotionPiece },
    ack: (res: Ack) => void,
  ) => void;
  'game:resign': (req: { gameId: string }, ack: (res: Ack) => void) => void;
  'game:rematch': (req: { gameId: string }, ack: (res: Ack) => void) => void;
  'queue:join': (ack: (res: Ack<{ gameId?: string }>) => void) => void;
  'queue:leave': (ack: (res: Ack) => void) => void;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'queue:matched': (payload: { gameId: string }) => void;
}

/** HTTP payloads. */
export interface GuestSession {
  token: string;
  playerId: string;
  name: string;
}

export interface HealthResponse {
  status: 'ok';
  persistence: 'in-memory';
  uptimeSeconds: number;
}

export interface GateInfo {
  enabled: boolean;
  /** 'arena' protects only arena rooms; 'all' protects room creation and joining. */
  scope: 'arena' | 'all';
  chainId: number | null;
  chainName: string | null;
  tokenAddress: string | null;
  symbol: string;
  requiredBalance: string;
  testnetOnly: true;
}

export type GateInfoResponse = GateInfo | { enabled: false; testnetOnly: true };

export interface GateStatus {
  authorized: boolean;
  address: string | null;
  expiresAt: number | null;
}

export interface GateChallenge {
  message: string;
  expiresAt: number;
}

export const GAME_ID_PATTERN = /^[A-Z2-9]{6,12}$/;
