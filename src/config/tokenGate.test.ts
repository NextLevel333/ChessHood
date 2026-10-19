import { describe, expect, it } from 'vitest';
import { isTokenConfigured, parseTokenGateConfig } from './tokenGate';

describe('token gate config', () => {
  it('is not configured by default', () => {
    expect(isTokenConfigured(parseTokenGateConfig({}))).toBe(false);
  });

  it('is configured when all fields are valid', () => {
    const cfg = parseTokenGateConfig({
      VITE_TOKEN_GATE_ENABLED: 'true',
      VITE_TOKEN_CHAIN_ID: '1',
      VITE_TOKEN_CONTRACT_ADDRESS: '0x' + 'a'.repeat(40),
      VITE_TOKEN_REQUIRED_BALANCE: '1000',
    });
    expect(isTokenConfigured(cfg)).toBe(true);
  });

  it('rejects invalid addresses', () => {
    const cfg = parseTokenGateConfig({
      VITE_TOKEN_GATE_ENABLED: 'true',
      VITE_TOKEN_CHAIN_ID: '1',
      VITE_TOKEN_CONTRACT_ADDRESS: '0x123',
      VITE_TOKEN_REQUIRED_BALANCE: '5',
    });
    expect(cfg.contractAddress).toBeNull();
    expect(isTokenConfigured(cfg)).toBe(false);
  });

  it('falls back to defaults for blank or invalid values', () => {
    const cfg = parseTokenGateConfig({
      VITE_TOKEN_DECIMALS: '',
      VITE_TOKEN_REQUIRED_BALANCE: '-5',
      VITE_TOKEN_SYMBOL: ' ',
    });
    expect(cfg.decimals).toBe(18);
    expect(cfg.requiredBalance).toBe(0);
    expect(cfg.symbol).toBe('HOOD');
  });
});
