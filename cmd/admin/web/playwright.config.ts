import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/ui/',
    reuseExistingServer: false,
    timeout: 60_000,
    stderr: 'pipe',
    stdout: 'pipe'
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
