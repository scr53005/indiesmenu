import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // jsdom gives tests a real `localStorage`/`window` and future-proofs component tests.
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'scripts'],
  },
  resolve: {
    // Mirror tsconfig "@/*" so any lib file imported via the alias resolves under tests.
    // (keystore.ts itself uses relative imports per the CLAUDE.md alias gotcha; this is
    // belt-and-suspenders for future tested modules.)
    alias: { '@': resolve(__dirname, '.') },
  },
});
