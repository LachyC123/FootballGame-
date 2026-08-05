import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/journeys',
  timeout: 30_000,
  // Journeys drive the game with real-time key holds; parallel workers starve
  // each other's frame budget and make the long walk legs flaky. Run serial.
  workers: 1,
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: 'only-on-failure',
    // Pre-installed Chromium in the remote environment; overridable locally.
    launchOptions: process.env['PW_CHROMIUM_PATH']
      ? { executablePath: process.env['PW_CHROMIUM_PATH'] }
      : {},
  },
  // Firefox/WebKit are added at Phase 5 hardening per docs/08; Chromium is the
  // pre-installed browser in this environment (see docs/DECISIONS.md).
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
