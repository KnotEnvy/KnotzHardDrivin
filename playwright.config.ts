import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for runtime validation of the game.
 *
 * Serves the production build via `vite preview` on a dedicated port (4173) so
 * tests are repeatable and representative of the shipped bundle. Most legacy
 * specs in tests/e2e hardcode other ports / assume a manually-started server;
 * run targeted specs explicitly, e.g.:
 *   npx playwright test tests/e2e/smoke-foundation.spec.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    // Headless chromium_headless_shell throttles requestAnimationFrame to ~1/sec,
    // which freezes the rAF-driven game loop. Run headed with background-throttling
    // disabled so the loop ticks at a normal rate during runtime validation.
    headless: false,
    trace: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=CalculateNativeWinOcclusion',
      ],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
