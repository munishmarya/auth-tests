const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  /* Run tests sequentially to avoid database race conditions */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
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
