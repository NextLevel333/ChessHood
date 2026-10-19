import { useState } from 'react';
import { api } from '../net/api';
import { useRealtime } from '../net/useRealtime';
import { connectWallet, hasWallet, signChallenge } from '../wallet/wallet';

export function TestnetBadge() {
  return <span className="badge badge-warn testnet-badge">TESTNET / EXPERIMENTAL ONLY</span>;
}

export function GatePanel() {
  const { backend, apiUrl, session, gate, gateStatus, refreshGateStatus } = useRealtime();
  const [wallet, setWallet] = useState<{ address: `0x${string}`; chainId: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  let body;
  if (backend !== 'online' || !gate) {
    body = <p className="muted">Unavailable: the backend is not reachable or configured.</p>;
  } else if (!gate.enabled) {
    body = (
      <p>
        The testnet access gate is <strong>disabled</strong> on this server. Free private rooms and
        quick match work without a wallet.
      </p>
    );
  } else {
    const run = async (fn: () => Promise<void>) => {
      setBusy(true);
      setMessage(null);
      try {
        await fn();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setBusy(false);
      }
    };
    const connect = () => run(async () => setWallet(await connectWallet()));
    const verify = () =>
      run(async () => {
        if (!wallet || !apiUrl || !session) return;
        const { message: text } = await api.gateChallenge(apiUrl, session.token, wallet.address);
        const signature = await signChallenge(wallet.address, text);
        await api.gateVerify(apiUrl, session.token, wallet.address, signature);
        await refreshGateStatus();
      });
    body = (
      <>
        <p>
          Test arena access requires holding at least{' '}
          <strong>
            {gate.requiredBalance} {gate.symbol}
          </strong>{' '}
          on <strong>{gate.chainName}</strong> (chain {gate.chainId}). Scope:{' '}
          {gate.scope === 'all' ? 'all rooms and quick match' : 'arena rooms only'}. Signing is free
          and sends no transaction; the server checks the balance.
        </p>
        <p className="muted">
          Token contract: <code>{gate.tokenAddress}</code>
        </p>
        {gateStatus?.authorized ? (
          <p className="banner banner-ok">
            Access granted for {gateStatus.address} until{' '}
            {new Date(gateStatus.expiresAt ?? 0).toLocaleTimeString()}.
          </p>
        ) : (
          <div className="cta">
            {hasWallet() ? (
              <button type="button" className="btn btn-dark" onClick={connect} disabled={busy}>
                {wallet ? `Wallet: ${wallet.address.slice(0, 8)}…` : 'Connect wallet'}
              </button>
            ) : (
              <p className="muted">No browser wallet detected.</p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={verify}
              disabled={busy || !wallet}
            >
              Sign &amp; verify
            </button>
          </div>
        )}
        {wallet && wallet.chainId !== gate.chainId ? (
          <p className="muted">
            Your wallet is on chain {wallet.chainId}; switch it to {gate.chainName} to see your test
            tokens. The server always checks {gate.chainName}.
          </p>
        ) : null}
        {message ? (
          <p className="banner banner-warn" role="alert">
            {message}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section className="card gate-panel" aria-labelledby="gate-title">
      <h3 id="gate-title">Test arena access</h3>
      <TestnetBadge />
      {body}
      <p className="muted">
        Research gate only: no payments, wagers, prizes or mainnet tokens. Never use a wallet that
        holds real funds.
      </p>
    </section>
  );
}
