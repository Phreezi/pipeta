import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminhos relativos: funciona no GitHub Pages (/pipeta/) e no Capacitor.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // O Phaser sozinho tem ~1,2 MB (330 kB gzip).
    chunkSizeWarningLimit: 1400,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
