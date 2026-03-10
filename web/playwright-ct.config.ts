import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './tests/component',
  use: {
    ctPort: 3100,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
