import { randomBytes } from 'node:crypto';
import { createApp } from './app';
import { ConfigError, loadConfig } from './config';
import { TestnetGate, createRpcBalanceReader } from './gate';

try {
  // Optional local dev convenience: server/.env (git-ignored). Real env vars always win.
  try {
    process.loadEnvFile('.env');
  } catch {
    /* no .env file */
  }
  const config = loadConfig(process.env, () => randomBytes(32).toString('hex'));
  const gate = config.gate
    ? new TestnetGate(config.gate, createRpcBalanceReader(config.gate))
    : null;
  const running = createApp({ config, gate });

  setInterval(() => running.rooms.sweep(), 5 * 60_000).unref();

  running.httpServer.listen(config.port, () => {
    console.log(`ChessHood server listening on :${config.port} (in-memory rooms, no persistence)`);
    console.log(`Allowed origins: ${config.corsOrigins.join(', ')}`);
    console.log(
      gate
        ? `TESTNET gate ENABLED (${gate.config.chainName}, chain ${gate.config.chainId}, scope=${gate.config.scope}). Testnet/experimental only.`
        : 'Testnet gate disabled (default).',
    );
  });

  const shutdown = () => {
    void running.close().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`Configuration error: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
