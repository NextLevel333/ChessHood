import { describe, expect, it } from 'vitest';
import { resolveBackendUrls } from './env';

describe('resolveBackendUrls', () => {
  it('has no backend in production builds unless configured', () => {
    expect(resolveBackendUrls({}, false)).toEqual({ apiUrl: null, socketUrl: null });
  });

  it('defaults to the local dev server in development', () => {
    expect(resolveBackendUrls({}, true).apiUrl).toBe('http://localhost:3001');
  });

  it('uses VITE_API_URL for both, and VITE_SOCKET_URL when given; strips trailing slashes', () => {
    expect(resolveBackendUrls({ VITE_API_URL: 'https://api.example.com/' }, false)).toEqual({
      apiUrl: 'https://api.example.com',
      socketUrl: 'https://api.example.com',
    });
    expect(
      resolveBackendUrls(
        { VITE_API_URL: 'https://a.test', VITE_SOCKET_URL: 'wss://s.test/' },
        false,
      ).socketUrl,
    ).toBe('wss://s.test');
  });
});
