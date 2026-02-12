import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Separate environments: jsdom for React tests, node for others
    environmentMatchGlobs: [
      ['tests/hooks.test.tsx', 'jsdom'],
      ['tests/*.test.ts', 'node'],
    ],
  },
});
