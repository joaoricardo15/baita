import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://www.baita.help',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api',
      testMatch: /api-health\.spec\.ts/,
    },
  ],
})
