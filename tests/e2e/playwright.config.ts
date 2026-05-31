import fs from 'fs'
import path from 'path'

import { defineConfig } from '@playwright/test'

// Load .env file if it exists (local dev credentials)
const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...val] = line.split('=')
    if (key && !process.env[key]) process.env[key.trim()] = val.join('=').trim()
  }
}

const isLocal = process.env.TEST_ENV === 'local'

if (isLocal && !process.env.API_URL) {
  process.env.API_URL = 'http://localhost:5000/dev'
}

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: isLocal ? 'http://localhost:3000' : 'https://www.baita.help',
    trace: 'on-first-retry',
  },
  projects: [
    ...(isLocal
      ? [{ name: 'setup', testMatch: /auth\.setup\.ts/, testDir: '.' }]
      : []),
    {
      name: 'e2e',
      use: {
        browserName: 'chromium' as const,
        ...(isLocal ? { storageState: 'playwright/.auth/user.json' } : {}),
      },
      ...(isLocal ? { dependencies: ['setup'] } : {}),
    },
  ],
  ...(isLocal
    ? {
        webServer: {
          command: 'npx vite --port 3000 --open false',
          cwd: '../../apps/frontend',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 30000,
        },
      }
    : {}),
})
