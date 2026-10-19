import { describe, expect, it } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { loadConfig } from './config';
import { GateError, TestnetGate, type BalanceReader } from './gate';

const cfg = loadConfig(
  {
    TESTNET_GATE_ENABLED: 'true',
    TESTNET_CHAIN_ID: '11155111',
    TESTNET_RPC_URL: 'https://rpc.example.invalid',
    TESTNET_TOKEN_ADDRESS: '0x' + 'b'.repeat(40),
    TESTNET_REQUIRED_BALANCE: '5',
    TESTNET_TOKEN_DECIMALS: '0',
  },
  () => 'x'.repeat(40),
).gate!;

function setup(balance: bigint | Error) {
  let t = 1_000_000;
  const reader: BalanceReader = {
    balanceOf: async () => {
      if (balance instanceof Error) throw balance;
      return balance;
    },
  };
  const gate = new TestnetGate(cfg, reader, () => t);
  return { gate, advance: (ms: number) => (t += ms) };
}

async function statusCode(p: Promise<unknown>): Promise<number | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof GateError ? e.status : -1;
  }
}

describe('TestnetGate', () => {
  it('authorizes a valid signature from a wallet holding enough tokens', async () => {
    const { gate } = setup(5n);
    const account = privateKeyToAccount(generatePrivateKey());
    expect(gate.isAuthorized('p1')).toBe(false);
    const { message } = gate.createChallenge('p1', account.address, 'http://localhost:5173');
    expect(message).toContain('TESTNET');
    const signature = await account.signMessage({ message });
    const status = await gate.verify('p1', account.address, signature);
    expect(status.authorized).toBe(true);
    expect(gate.isAuthorized('p1')).toBe(true);
    expect(gate.isAuthorized('someone-else')).toBe(false);
  });

  it('rejects an insufficient balance', async () => {
    const { gate } = setup(4n);
    const account = privateKeyToAccount(generatePrivateKey());
    const { message } = gate.createChallenge('p1', account.address, 'o');
    expect(
      await statusCode(gate.verify('p1', account.address, await account.signMessage({ message }))),
    ).toBe(403);
    expect(gate.isAuthorized('p1')).toBe(false);
  });

  it('rejects signatures from a different wallet and makes challenges single-use', async () => {
    const { gate } = setup(100n);
    const owner = privateKeyToAccount(generatePrivateKey());
    const attacker = privateKeyToAccount(generatePrivateKey());
    const { message } = gate.createChallenge('p1', owner.address, 'o');
    expect(
      await statusCode(gate.verify('p1', owner.address, await attacker.signMessage({ message }))),
    ).toBe(401);
    // challenge was consumed, so even a correct signature now needs a fresh challenge
    expect(
      await statusCode(gate.verify('p1', owner.address, await owner.signMessage({ message }))),
    ).toBe(400);
  });

  it('rejects expired challenges and expires access', async () => {
    const { gate, advance } = setup(100n);
    const a = privateKeyToAccount(generatePrivateKey());
    const { message } = gate.createChallenge('p1', a.address, 'o');
    advance(cfg.challengeTtlMs + 1);
    expect(await statusCode(gate.verify('p1', a.address, await a.signMessage({ message })))).toBe(
      400,
    );

    const fresh = gate.createChallenge('p1', a.address, 'o');
    await gate.verify('p1', a.address, await a.signMessage({ message: fresh.message }));
    expect(gate.isAuthorized('p1')).toBe(true);
    advance(cfg.accessTtlMs + 1);
    expect(gate.isAuthorized('p1')).toBe(false);
  });

  it('reports RPC failures as 502 and rejects malformed input', async () => {
    const { gate } = setup(new Error('rpc down'));
    const a = privateKeyToAccount(generatePrivateKey());
    const { message } = gate.createChallenge('p1', a.address, 'o');
    expect(await statusCode(gate.verify('p1', a.address, await a.signMessage({ message })))).toBe(
      502,
    );
    expect(() => gate.createChallenge('p1', 'nope', 'o')).toThrow(GateError);
    expect(await statusCode(gate.verify('p1', a.address, 'bad'))).toBe(400);
  });
});
