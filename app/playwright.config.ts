import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * The whole stack runs for real — Vite, the socket server, and the Firebase
 * emulators — with sign-in going through the Auth emulator rather than Google's
 * live OAuth screens.
 */
const PORT = 4321;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    // One command brings up the emulators and the app together.
    command: `npm run emulators:free && npx firebase emulators:exec --project demo-super-ttt --only auth,firestore "npx cross-env PORT=${PORT} VITE_AUTH_EMULATOR_HOST=localhost:9399 VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_AUTH_DOMAIN=demo-super-ttt.firebaseapp.com VITE_FIREBASE_PROJECT_ID=demo-super-ttt GCLOUD_PROJECT=demo-super-ttt npx tsx server/index.ts"`,
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
