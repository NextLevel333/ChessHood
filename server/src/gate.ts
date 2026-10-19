/**
 * TESTNET-ONLY research access gate.
 *
 * Flow: client asks for a challenge -> wallet signs the message (no transaction, no gas, no funds
 * move) -> server recovers the signer, reads the ERC-20 `balanceOf` through a server-side RPC and
 * records a short-lived authorization for the guest session. The browser is never the authority.
 */
import { randomBytes } from 'node:crypto';
import { createPublicClient, erc20Abi, getAddress, http, isAddress, verifyMessage } from 'viem';
import type { GateChallenge, GateInfo, GateStatus } from '@chesshood/shared';
import type { GateConfig } from './config';

export interface BalanceReader {
  balanceOf(address: `0x${string}`): Promise<bigint>;
}

export function createRpcBalanceReader(config: GateConfig): BalanceReader {
  const client = createPublicClient({ transport: http(config.rpcUrl, { timeout: 10_000 }) });
  return {
    balanceOf: (address) =>
      client.readContract({
        address: config.tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      }),
  };
}

export class GateError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface PendingChallenge {
  message: string;
  address: `0x${string}`;
  expiresAt: number;
}

interface Access {
  address: `0x${string}`;
  expiresAt: number;
}

export class TestnetGate {
  private readonly challenges = new Map<string, PendingChallenge>();
  private readonly access = new Map<string, Access>();

  constructor(
    readonly config: GateConfig,
    private readonly reader: BalanceReader,
    private readonly now: () => number = Date.now,
  ) {}

  info(): GateInfo {
    return {
      enabled: true,
      scope: this.config.scope,
      chainId: this.config.chainId,
      chainName: this.config.chainName,
      tokenAddress: this.config.tokenAddress,
      symbol: this.config.symbol,
      requiredBalance: this.config.requiredBalance,
      testnetOnly: true,
    };
  }

  createChallenge(playerId: string, rawAddress: unknown, origin: string): GateChallenge {
    if (typeof rawAddress !== 'string' || !isAddress(rawAddress)) {
      throw new GateError(400, 'A valid wallet address is required.');
    }
    const address = getAddress(rawAddress);
    const issuedAt = this.now();
    const expiresAt = issuedAt + this.config.challengeTtlMs;
    const message = [
      'ChessHood TESTNET / EXPERIMENTAL access request',
      '',
      'Sign to prove you control this wallet. This is NOT a transaction, costs no gas and',
      'moves no funds. It grants research access on a test network only.',
      '',
      `Wallet: ${address}`,
      `Chain ID: ${this.config.chainId} (${this.config.chainName})`,
      `Session: ${playerId}`,
      `Origin: ${origin}`,
      `Nonce: ${randomBytes(16).toString('hex')}`,
      `Issued At: ${new Date(issuedAt).toISOString()}`,
      `Expires At: ${new Date(expiresAt).toISOString()}`,
    ].join('\n');
    this.challenges.set(playerId, { message, address, expiresAt });
    this.prune();
    return { message, expiresAt };
  }

  /** Verifies the signature + on-chain balance. Challenges are single-use. */
  async verify(playerId: string, rawAddress: unknown, signature: unknown): Promise<GateStatus> {
    if (typeof rawAddress !== 'string' || !isAddress(rawAddress)) {
      throw new GateError(400, 'A valid wallet address is required.');
    }
    if (typeof signature !== 'string' || !/^0x[a-fA-F0-9]{130}$/.test(signature)) {
      throw new GateError(400, 'A valid signature is required.');
    }
    const address = getAddress(rawAddress);
    const pending = this.challenges.get(playerId);
    this.challenges.delete(playerId);
    if (!pending || pending.address !== address) {
      throw new GateError(400, 'No matching challenge. Request a new one.');
    }
    if (pending.expiresAt < this.now()) throw new GateError(400, 'Challenge expired.');

    let valid: boolean;
    try {
      valid = await verifyMessage({
        address,
        message: pending.message,
        signature: signature as `0x${string}`,
      });
    } catch {
      valid = false;
    }
    if (!valid) throw new GateError(401, 'Signature does not match the wallet address.');

    let balance: bigint;
    try {
      balance = await this.reader.balanceOf(address);
    } catch {
      throw new GateError(502, 'Could not read the token balance from the RPC endpoint.');
    }
    if (balance < this.config.requiredBalanceRaw) {
      throw new GateError(
        403,
        `Wallet holds less than the required ${this.config.requiredBalance} ${this.config.symbol} (testnet).`,
      );
    }
    const expiresAt = this.now() + this.config.accessTtlMs;
    this.access.set(playerId, { address, expiresAt });
    return { authorized: true, address, expiresAt };
  }

  status(playerId: string): GateStatus {
    const a = this.access.get(playerId);
    if (!a || a.expiresAt < this.now()) {
      this.access.delete(playerId);
      return { authorized: false, address: null, expiresAt: null };
    }
    return { authorized: true, address: a.address, expiresAt: a.expiresAt };
  }

  isAuthorized(playerId: string): boolean {
    return this.status(playerId).authorized;
  }

  private prune() {
    const t = this.now();
    for (const [k, v] of this.challenges) if (v.expiresAt < t) this.challenges.delete(k);
  }
}
