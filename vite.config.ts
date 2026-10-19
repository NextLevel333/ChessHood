import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages project sites are served from /<repo>/. Override with VITE_BASE if the repo
// is renamed or a custom domain is used (e.g. VITE_BASE=/).
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: command === 'build' ? env.VITE_BASE || '/ChessHood/' : '/',
    plugins: [react()],
    test: { environment: 'node', exclude: ['**/node_modules/**', '**/dist/**'] },
  };
});
