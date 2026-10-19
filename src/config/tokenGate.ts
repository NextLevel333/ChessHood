/**
 * Centralized configuration for the FUTURE ERC-20 token gate.
 *
 * Nothing here connects to a wallet or chain. It only describes what a future
 * verifier would need. Values come from Vite env vars (see `.env.example`).
 *
 * The gate is considered "configured" only when the feature flag is on AND the
 * chain ID, a valid contract address, and a positive required balance are set.
 * Until then the UI shows "token not live yet" and gated modes stay locked.
 */

export interface TokenGateConfig {
  /** Master feature flag. */
  enabled: boolean;
  /** EVM chain ID, or null when unset. */
  chainId: number | null;
  /** ERC-20 contract address, or null when unset/invalid. */
  contractAddress: string | null;
  /** Display symbol. */
  symbol: string;
  /** Required balance in whole-token units. */
  requiredBalance: number;
  /** Token decimals for future on-chain balance conversion. */
  decimals: number;
}

type Env = Record<string, string | undefined>;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function toPositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseTokenGateConfig(env: Env): TokenGateConfig {
  const address = env.VITE_TOKEN_CONTRACT_ADDRESS?.trim() ?? '';
  const required = Number(env.VITE_TOKEN_REQUIRED_BALANCE?.trim() || 0);
  const decimals = Number(env.VITE_TOKEN_DECIMALS?.trim() || 18);
  return {
    enabled: env.VITE_TOKEN_GATE_ENABLED === 'true',
    chainId: toPositiveInt(env.VITE_TOKEN_CHAIN_ID),
    contractAddress: ADDRESS_RE.test(address) ? address : null,
    symbol: env.VITE_TOKEN_SYMBOL?.trim() || 'HOOD',
    requiredBalance: Number.isFinite(required) && required > 0 ? required : 0,
    decimals: Number.isInteger(decimals) && decimals >= 0 ? decimals : 18,
  };
}

export function isTokenConfigured(config: TokenGateConfig): boolean {
  return (
    config.enabled &&
    config.chainId !== null &&
    config.contractAddress !== null &&
    config.requiredBalance > 0
  );
}

export const tokenGateConfig: TokenGateConfig = parseTokenGateConfig(
  import.meta.env as unknown as Env,
);

/**
 * Whether gated modes could be unlocked. Even when the token is configured,
 * wallet verification and compliance are not implemented, so gated modes
 * remain unavailable in this foundation.
 */
export const GATED_MODES_AVAILABLE = false;
