import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          globals: true,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          globals: true,
          // Real sockets and an emulator round-trip need more headroom than the
          // 5s default, and the suites share one server so they run serially.
          testTimeout: 20000,
          hookTimeout: 30000,
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/gameLogic.ts', 'server/**/*.ts'],
      exclude: ['server/index.ts'],
    },
  },
});
