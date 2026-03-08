import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      // Separate environments: jsdom for React tests, node for others
      environmentMatchGlobs: [
        ['tests/hooks.test.tsx', 'jsdom'],
        ['tests/components.test.tsx', 'jsdom'],
        ['tests/*.test.ts', 'node'],
      ],
      env: {
        FS_TEST_URL: env.FS_TEST_URL ?? '',
        FS_TEST_USERNAME: env.FS_TEST_USERNAME ?? '',
        FS_TEST_PASSWORD: env.FS_TEST_PASSWORD ?? '',
        FS_TEST_MARKET_ID: env.FS_TEST_MARKET_ID ?? '',
      },
    },
  };
});
