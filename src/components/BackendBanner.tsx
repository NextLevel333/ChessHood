import { useRealtime } from '../net/useRealtime';

export function BackendBanner() {
  const { backend, connection, retry } = useRealtime();
  if (backend === 'online' && connection === 'connected') {
    return <p className="banner banner-ok">Connected to the realtime server.</p>;
  }
  if (backend === 'unconfigured') {
    return (
      <p className="banner banner-warn" role="alert">
        <strong>Online play unavailable:</strong> no backend is configured for this build. Set{' '}
        <code>VITE_API_URL</code> (and optionally <code>VITE_SOCKET_URL</code>) and deploy the
        server. Offline practice still works.
      </p>
    );
  }
  if (backend === 'checking') return <p className="banner">Checking the realtime server…</p>;
  if (backend === 'unreachable') {
    return (
      <p className="banner banner-warn" role="alert">
        <strong>Online play unavailable:</strong> the realtime server is not reachable.{' '}
        <button type="button" className="link-btn" onClick={retry}>
          Retry
        </button>
      </p>
    );
  }
  return (
    <p className="banner banner-warn" role="status">
      {connection === 'connecting' ? 'Connecting…' : 'Connection lost — reconnecting…'}
    </p>
  );
}
