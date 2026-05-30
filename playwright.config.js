const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  /* Run tests sequentially to avoid database race conditions */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,        // retry once on transient network/timeout failures
  workers: 1,
  timeout: 45000,    // 45s per test — up from 30s default for slow server responses
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'https://testpmsmmarya.duckdns.org',
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
