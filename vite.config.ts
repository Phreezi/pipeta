import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminhos relativos: funciona no GitHub Pages (/pipeta/) e no Capacitor.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
