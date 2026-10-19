/**
 * Server configuration, read only from environment variables and validated strictly.
 * Nothing here is ever sent to the browser except the explicit public `GateInfo` view.
 */
import { parseUnits } from 'viem';

type Env = Record<string, string | undefined>;

/** Testnets that may be used without extra opt-in. */
export const SUPPORTED_TESTNETS: Record<number, string> = {
  11155111: 'Ethereum Sepolia',
  17000: 'Ethereum Holesky',
  84532: 'Base Sepolia',
  421614: 'Arbitrum Sepolia',
  11155420: 'OP Sepolia',
  80002: 'Polygon Amoy',
  97: 'BNB Smart Chain Testnet',
};

/** Known mainnets. These are ALWAYS rejected, even if listed in TESTNET_EXTRA_CHAIN_IDS. */
export const BLOCKED_MAINNET_CHAIN_IDS = new Set<number>([
  1, 10, 25, 56, 100, 137, 250, 324, 1101, 8453, 42161, 42170, 42220, 43114, 59144, 534352, 7777777,
]);

export type GateScope = 'arena' | 'all';

export interface GateConfig {
  enabled: boolean;
  scope: GateScope;
  chainId: number;
  chainName: string;
  rpcUrl: string;
  tokenAddress: `0x${string}`;
  symbol: string;
  decimals: number;
  /** Required balance in the token's smallest unit. */
  requiredBalanceRaw: bigint;
  /** Human readable required balance, as configured. */
  requiredBalance: string;
  challengeTtlMs: number;
  accessTtlMs: number;
}

export interface ServerConfig {
  port: number;
  production: boolean;
  corsOrigins: string[];
  sessionSecret: string;
  /** Number of reverse-proxy hops to trust for client IPs (0 = none). */
  trustProxyHops: number;
  /** Null when the gate is disabled (the default). */
  gate: GateConfig | null;
}

export class ConfigError extends Error {}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function parseOrigins(raw: string | undefined, production: boolean): string[] {
  const list = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    if (production) throw new ConfigError('CORS_ORIGINS is required when NODE_ENV=production');
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  for (const origin of list) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new ConfigError(`CORS_ORIGINS contains an invalid origin: ${origin}`);
    }
    if (origin === '*' || url.origin !== origin) {
      throw new ConfigError(
        `CORS_ORIGINS entries must be exact origins without path (e.g. https://user.github.io): ${origin}`,
      );
    }
  }
  return list;
}

function parseGate(env: Env): GateConfig | null {
  if (env.TESTNET_GATE_ENABLED !== 'true') return null;

  const missing = [
    'TESTNET_CHAIN_ID',
    'TESTNET_RPC_URL',
    'TESTNET_TOKEN_ADDRESS',
    'TESTNET_REQUIRED_BALANCE',
  ].filter((k) => !env[k]?.trim());
  if (missing.length) {
    throw new ConfigError(`Testnet gate enabled but missing: ${missing.join(', ')}`);
  }

  const chainId = Number(env.TESTNET_CHAIN_ID!.trim());
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new ConfigError('TESTNET_CHAIN_ID must be a positive integer');
  }
  if (BLOCKED_MAINNET_CHAIN_IDS.has(chainId)) {
    throw new ConfigError(`Chain ${chainId} is a mainnet. The gate is testnet-only.`);
  }
  const extra = (env.TESTNET_EXTRA_CHAIN_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  if (extra.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new ConfigError('TESTNET_EXTRA_CHAIN_IDS must be a comma-separated list of chain IDs');
  }
  const chainName = SUPPORTED_TESTNETS[chainId];
  if (!chainName && !extra.includes(chainId)) {
    throw new ConfigError(
      `Chain ${chainId} is not a recognised testnet. Add it explicitly to TESTNET_EXTRA_CHAIN_IDS ` +
        'only if you have verified it is a testnet.',
    );
  }

  const rpcUrl = env.TESTNET_RPC_URL!.trim();
  try {
    const u = new URL(rpcUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol');
  } catch {
    throw new ConfigError('TESTNET_RPC_URL must be an http(s) URL');
  }

  const tokenAddress = env.TESTNET_TOKEN_ADDRESS!.trim();
  if (!ADDRESS_RE.test(tokenAddress)) {
    throw new ConfigError('TESTNET_TOKEN_ADDRESS must be 0x followed by 40 hex characters');
  }

  const decimalsRaw = env.TESTNET_TOKEN_DECIMALS?.trim() || '18';
  const decimals = Number(decimalsRaw);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new ConfigError('TESTNET_TOKEN_DECIMALS must be an integer between 0 and 36');
  }

  const requiredBalance = env.TESTNET_REQUIRED_BALANCE!.trim();
  if (!/^\d+(\.\d+)?$/.test(requiredBalance)) {
    throw new ConfigError('TESTNET_REQUIRED_BALANCE must be a positive decimal number');
  }
  const requiredBalanceRaw = parseUnits(requiredBalance, decimals);
  if (requiredBalanceRaw <= 0n) {
    throw new ConfigError('TESTNET_REQUIRED_BALANCE must be greater than zero');
  }

  const scope = (env.TESTNET_GATE_SCOPE?.trim() || 'arena') as GateScope;
  if (scope !== 'arena' && scope !== 'all') {
    throw new ConfigError('TESTNET_GATE_SCOPE must be "arena" or "all"');
  }

  return {
    enabled: true,
    scope,
    chainId,
    chainName: chainName ?? `Custom testnet ${chainId}`,
    rpcUrl,
    tokenAddress: tokenAddress as `0x${string}`,
    symbol: env.TESTNET_TOKEN_SYMBOL?.trim() || 'TEST',
    decimals,
    requiredBalanceRaw,
    requiredBalance,
    challengeTtlMs: 5 * 60_000,
    accessTtlMs: 60 * 60_000,
  };
}

export function loadConfig(env: Env, randomSecret: () => string): ServerConfig {
  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT?.trim() || 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ConfigError('PORT must be a valid port number');
  }
  let sessionSecret = env.SESSION_SECRET?.trim() ?? '';
  if (!sessionSecret) {
    if (production) throw new ConfigError('SESSION_SECRET is required when NODE_ENV=production');
    sessionSecret = randomSecret();
  } else if (sessionSecret.length < 32) {
    throw new ConfigError('SESSION_SECRET must be at least 32 characters');
  }
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS?.trim() || 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
    throw new ConfigError('TRUST_PROXY_HOPS must be an integer between 0 and 10');
  }
  return {
    port,
    production,
    corsOrigins: parseOrigins(env.CORS_ORIGINS, production),
    sessionSecret,
    trustProxyHops,
    gate: parseGate(env),
  };
}
