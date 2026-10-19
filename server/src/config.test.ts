import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config';

const secret = () => 'x'.repeat(40);
const gateEnv = {
  TESTNET_GATE_ENABLED: 'true',
  TESTNET_CHAIN_ID: '11155111',
  TESTNET_RPC_URL: 'https://rpc.example.invalid',
  TESTNET_TOKEN_ADDRESS: '0x' + 'a'.repeat(40),
  TESTNET_REQUIRED_BALANCE: '10',
};

describe('loadConfig', () => {
  it('keeps the gate disabled by default', () => {
    const c = loadConfig({}, secret);
    expect(c.gate).toBeNull();
    expect(c.corsOrigins).toContain('http://localhost:5173');
  });

  it('requires secrets and explicit origins in production, and forbids wildcards', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' }, secret)).toThrow(ConfigError);
    expect(() =>
      loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 's'.repeat(32) }, secret),
    ).toThrow(/CORS_ORIGINS/);
    expect(() => loadConfig({ CORS_ORIGINS: '*' }, secret)).toThrow(ConfigError);
    expect(() => loadConfig({ CORS_ORIGINS: 'https://u.github.io/ChessHood/' }, secret)).toThrow(
      ConfigError,
    );
    const ok = loadConfig(
      {
        NODE_ENV: 'production',
        SESSION_SECRET: 's'.repeat(32),
        CORS_ORIGINS: 'https://u.github.io',
      },
      secret,
    );
    expect(ok.corsOrigins).toEqual(['https://u.github.io']);
  });

  it('accepts a complete testnet gate config', () => {
    const g = loadConfig(gateEnv, secret).gate!;
    expect(g.chainName).toBe('Ethereum Sepolia');
    expect(g.requiredBalanceRaw).toBe(10n * 10n ** 18n);
    expect(g.scope).toBe('arena');
  });

  it('rejects missing settings, mainnets (even when force-listed) and unknown chains', () => {
    expect(() => loadConfig({ TESTNET_GATE_ENABLED: 'true' }, secret)).toThrow(/missing/);
    expect(() => loadConfig({ ...gateEnv, TESTNET_CHAIN_ID: '1' }, secret)).toThrow(/mainnet/);
    expect(() =>
      loadConfig({ ...gateEnv, TESTNET_CHAIN_ID: '1', TESTNET_EXTRA_CHAIN_IDS: '1' }, secret),
    ).toThrow(/mainnet/);
    expect(() => loadConfig({ ...gateEnv, TESTNET_CHAIN_ID: '424242' }, secret)).toThrow(
      /not a recognised testnet/,
    );
    expect(
      loadConfig(
        { ...gateEnv, TESTNET_CHAIN_ID: '424242', TESTNET_EXTRA_CHAIN_IDS: '424242' },
        secret,
      ).gate?.chainId,
    ).toBe(424242);
  });

  it('validates token address, RPC URL and balance', () => {
    expect(() => loadConfig({ ...gateEnv, TESTNET_TOKEN_ADDRESS: '0x123' }, secret)).toThrow(
      ConfigError,
    );
    expect(() => loadConfig({ ...gateEnv, TESTNET_RPC_URL: 'ftp://x' }, secret)).toThrow(
      ConfigError,
    );
    expect(() => loadConfig({ ...gateEnv, TESTNET_REQUIRED_BALANCE: '0' }, secret)).toThrow(
      ConfigError,
    );
    expect(() => loadConfig({ ...gateEnv, TESTNET_REQUIRED_BALANCE: 'abc' }, secret)).toThrow(
      ConfigError,
    );
  });

  it('ignores gate settings when the master switch is off', () => {
    expect(
      loadConfig({ ...gateEnv, TESTNET_GATE_ENABLED: 'false', TESTNET_CHAIN_ID: '1' }, secret).gate,
    ).toBeNull();
  });
});
