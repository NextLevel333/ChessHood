import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ChessHood/' : '/',
  plugins: [react()],
  test: { environment: 'node' },
}));
