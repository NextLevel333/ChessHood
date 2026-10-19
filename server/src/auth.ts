/**
 * Identity layer. The rest of the server only depends on the `Authenticator` interface,
 * so real authentication (OAuth, passwordless email, ...) can replace guest sessions
 * without touching game or socket code.
 */
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { GuestSession } from '@chesshood/shared';

export interface Identity {
  playerId: string;
  name: string;
}

export interface Authenticator {
  /** Issue a new session (guest prototype: no credentials). */
  issue(): GuestSession;
  /** Validate a bearer token; returns null when invalid or expired. */
  verify(token: string | undefined | null): Identity | null;
}

const ADJECTIVES = ['Lime', 'Swift', 'Bold', 'Quiet', 'Sharp', 'Lucky', 'Neon', 'Brave'];
const PIECES = ['Pawn', 'Knight', 'Rook', 'Bishop', 'Queen', 'King'];

function guestName(): string {
  return `${ADJECTIVES[randomInt(ADJECTIVES.length)]} ${PIECES[randomInt(PIECES.length)]} ${randomInt(100)}`;
}

export class GuestAuthenticator implements Authenticator {
  constructor(
    private readonly secret: string,
    private readonly ttlMs = 7 * 24 * 60 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }

  issue(): GuestSession {
    const playerId = randomUUID();
    const name = guestName();
    const body = Buffer.from(
      JSON.stringify({ id: playerId, name, exp: this.now() + this.ttlMs }),
    ).toString('base64url');
    return { token: `${body}.${this.sign(body)}`, playerId, name };
  }

  verify(token: string | undefined | null): Identity | null {
    if (typeof token !== 'string') return null;
    const [body, sig, extra] = token.split('.');
    if (!body || !sig || extra !== undefined) return null;
    const expected = Buffer.from(this.sign(body));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
        id?: unknown;
        name?: unknown;
        exp?: unknown;
      };
      if (typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.exp !== 'number') {
        return null;
      }
      if (p.exp < this.now()) return null;
      return { playerId: p.id, name: p.name };
    } catch {
      return null;
    }
  }
}
