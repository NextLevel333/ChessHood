import { isTokenConfigured, tokenGateConfig } from '../config/tokenGate';

export function TokenStatus() {
  const configured = isTokenConfigured(tokenGateConfig);
  return (
    <section id="token" className="section token">
      <h2>Token-Gated Arena</h2>
      <div className="card status-card">
        <span className={`badge ${configured ? 'badge-info' : 'badge-warn'}`}>
          {configured ? 'Token configured — verification not built yet' : 'Token not live yet'}
        </span>
        <p>
          {configured
            ? `A gate for ${tokenGateConfig.symbol} is configured, but wallet verification and compliance review are not implemented, so gated modes stay locked.`
            : 'No token has been launched or configured. Gated modes are coming soon and will only be considered after wallet verification, security work, and legal/compliance review.'}
        </p>
        <p className="muted">
          Planned requirement: hold at least {tokenGateConfig.requiredBalance || '—'}{' '}
          {tokenGateConfig.symbol} (placeholder). No payments, wagers, or prizes exist in this app.
        </p>
      </div>
    </section>
  );
}
