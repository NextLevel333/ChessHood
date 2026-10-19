import { createServer, type Server as HttpServer } from 'node:http';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Server as IOServer } from 'socket.io';
import type {
  Ack,
  ClientToServerEvents,
  GateInfoResponse,
  HealthResponse,
  ServerToClientEvents,
} from '@chesshood/shared';
import { GuestAuthenticator, type Authenticator, type Identity } from './auth';
import type { ServerConfig } from './config';
import { GateError, type TestnetGate } from './gate';
import { RateLimiter } from './rateLimit';
import { GameError, RoomManager, normalizeGameId } from './rooms';

export interface AppDeps {
  config: ServerConfig;
  gate?: TestnetGate | null;
  auth?: Authenticator;
  rooms?: RoomManager;
}

export interface RunningApp {
  httpServer: HttpServer;
  io: IOServer<ClientToServerEvents, ServerToClientEvents>;
  rooms: RoomManager;
  close(): Promise<void>;
}

type AuthedRequest = Request & { identity: Identity };

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export function createApp(deps: AppDeps): RunningApp {
  const { config } = deps;
  const gate = deps.gate ?? null;
  const auth = deps.auth ?? new GuestAuthenticator(config.sessionSecret);
  const rooms = deps.rooms ?? new RoomManager();
  const started = Date.now();
  const eventLimiter = new RateLimiter(60, 10_000);

  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxyHops > 0) app.set('trust proxy', config.trustProxyHops);
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '4kb' }));
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }),
  );

  app.get('/health', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      persistence: 'in-memory',
      uptimeSeconds: Math.round((Date.now() - started) / 1000),
    };
    res.json(body);
  });

  app.post('/api/guest', (_req, res) => {
    res.json(auth.issue());
  });

  app.get('/api/gate', (_req, res) => {
    const body: GateInfoResponse = gate ? gate.info() : { enabled: false, testnetOnly: true };
    res.json(body);
  });

  const requireIdentity = (req: Request, res: Response, next: NextFunction) => {
    const identity = auth.verify(bearer(req));
    if (!identity) {
      res.status(401).json({ error: 'Missing or invalid session token.' });
      return;
    }
    (req as AuthedRequest).identity = identity;
    next();
  };

  const requireGate = (_req: Request, res: Response, next: NextFunction) => {
    if (!gate) {
      res.status(404).json({ error: 'The testnet gate is disabled on this server.' });
      return;
    }
    next();
  };

  const gateRoute =
    (fn: (req: AuthedRequest) => unknown | Promise<unknown>) =>
    async (req: Request, res: Response) => {
      try {
        res.json(await fn(req as AuthedRequest));
      } catch (err) {
        if (err instanceof GateError) res.status(err.status).json({ error: err.message });
        else res.status(500).json({ error: 'Internal error.' });
      }
    };

  app.get(
    '/api/gate/status',
    requireIdentity,
    requireGate,
    gateRoute((req) => gate!.status(req.identity.playerId)),
  );
  app.post(
    '/api/gate/challenge',
    requireIdentity,
    requireGate,
    gateRoute((req) =>
      gate!.createChallenge(
        req.identity.playerId,
        req.body?.address,
        req.headers.origin ?? config.corsOrigins[0],
      ),
    ),
  );
  app.post(
    '/api/gate/verify',
    requireIdentity,
    requireGate,
    gateRoute((req) => gate!.verify(req.identity.playerId, req.body?.address, req.body?.signature)),
  );

  const httpServer = createServer(app);
  const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: config.corsOrigins },
    maxHttpBufferSize: 4_096,
  });

  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    const identity = auth.verify(typeof token === 'string' ? token : null);
    if (!identity) return next(new Error('UNAUTHENTICATED'));
    socket.data.identity = identity;
    next();
  });

  const broadcast = (gameId: string) => {
    io.to(`game:${gameId}`).emit('game:state', rooms.getState(gameId));
  };

  const gateCheck = (who: Identity, arena: boolean) => {
    if (arena && !gate) {
      throw new GameError('BAD_REQUEST', 'Arena rooms are disabled: the testnet gate is off.');
    }
    if (gate && (arena || gate.config.scope === 'all') && !gate.isAuthorized(who.playerId)) {
      throw new GameError(
        'GATE_REQUIRED',
        'Testnet token access is required. Connect and verify a wallet first.',
      );
    }
  };

  io.on('connection', (socket) => {
    const who = socket.data.identity as Identity;
    rooms.connect(who.playerId);
    void socket.join(`player:${who.playerId}`);
    rooms.gamesFor(who.playerId).forEach(broadcast);

    const handle =
      <A extends unknown[]>(fn: (...args: A) => object | void) =>
      (...args: unknown[]) => {
        const ack = args[args.length - 1];
        if (typeof ack !== 'function') return;
        const reply = ack as (res: Ack<object>) => void;
        try {
          if (!eventLimiter.allow(who.playerId)) {
            throw new GameError('RATE_LIMITED', 'Slow down: too many requests.');
          }
          const payload = args.slice(0, -1);
          const req = payload[0] as Record<string, unknown> | undefined;
          if (payload.length > 0 && (typeof req !== 'object' || req === null)) {
            throw new GameError('BAD_REQUEST', 'Malformed request.');
          }
          reply({ ok: true, ...(fn(...(payload as A)) ?? {}) });
        } catch (err) {
          if (err instanceof GameError) {
            reply({ ok: false, error: { code: err.code, message: err.message } });
          } else {
            reply({ ok: false, error: { code: 'BAD_REQUEST', message: 'Request failed.' } });
          }
        }
      };

    const enter = (gameId: string) => {
      void socket.join(`game:${gameId}`);
      broadcast(gameId);
    };

    socket.on(
      'game:create',
      handle((req: { arena?: unknown }) => {
        const arena = req.arena === true;
        gateCheck(who, arena);
        const state = rooms.createGame(who, { arena });
        enter(state.id);
        return { role: 'w' as const, state };
      }),
    );

    socket.on(
      'game:join',
      handle((req: { gameId?: unknown }) => {
        const id = normalizeGameId(req.gameId);
        gateCheck(who, rooms.isArena(id));
        const { role, state } = rooms.join(id, who);
        enter(state.id);
        return { role, state };
      }),
    );

    socket.on(
      'game:move',
      handle((req: { gameId?: unknown; from?: unknown; to?: unknown; promotion?: unknown }) => {
        const state = rooms.move(normalizeGameId(req.gameId), who.playerId, req);
        broadcast(state.id);
      }),
    );

    socket.on(
      'game:resign',
      handle((req: { gameId?: unknown }) => {
        broadcast(rooms.resign(normalizeGameId(req.gameId), who.playerId).id);
      }),
    );

    socket.on(
      'game:rematch',
      handle((req: { gameId?: unknown }) => {
        broadcast(rooms.rematch(normalizeGameId(req.gameId), who.playerId).id);
      }),
    );

    socket.on(
      'queue:join',
      handle(() => {
        gateCheck(who, false);
        const match = rooms.enqueue(who);
        if (!match) return {};
        io.to(`player:${match.opponentId}`).emit('queue:matched', { gameId: match.state.id });
        return { gameId: match.state.id };
      }),
    );

    socket.on(
      'queue:leave',
      handle(() => {
        rooms.leaveQueue(who.playerId);
      }),
    );

    socket.on('disconnect', () => {
      rooms.disconnect(who.playerId).forEach(broadcast);
    });
  });

  return {
    httpServer,
    io,
    rooms,
    close: () =>
      new Promise<void>((resolve) => {
        void io.close(() => resolve());
      }),
  };
}
