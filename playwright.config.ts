import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100/login',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { DJANGO_API_URL: 'http://localhost:8000/api', SESSION_SECRET: 'e2e-'.padEnd(40, 'x') },
  },
});
