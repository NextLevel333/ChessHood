import { createContext } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  GateInfoResponse,
  GateStatus,
  GuestSession,
  ServerToClientEvents,
} from '@chesshood/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type BackendStatus = 'unconfigured' | 'checking' | 'unreachable' | 'online';
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface RealtimeValue {
  backend: BackendStatus;
  connection: ConnectionState;
  apiUrl: string | null;
  session: GuestSession | null;
  socket: AppSocket | null;
  gate: GateInfoResponse | null;
  gateStatus: GateStatus | null;
  retry: () => void;
  refreshGateStatus: () => Promise<void>;
}

export const RealtimeContext = createContext<RealtimeValue | null>(null);
