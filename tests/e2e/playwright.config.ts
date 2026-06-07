import fs from 'fs'
import path from 'path'

import { defineConfig } from '@playwright/test'

const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...val] = line.split('=')
    if (key && !process.env[key]) process.env[key.trim()] = val.join('=').trim()
  }
}

const isLocal = process.env.TEST_ENV === 'local'
const isLocalBackend = isLocal && !process.env.API_URL

if (isLocalBackend) {
  process.env.API_URL = 'http://localhost:5000/prod'
}

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  fullyParallel: false,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: isLocalBackend
      ? 'http://localhost:3000'
      : 'https://www.baita.help',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/user-lifecycle.spec.ts',
    },
    {
      name: 'journeys',
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: [
        '**/connectors/*.spec.ts',
        '**/todo-journey.spec.ts',
        '**/bot-journey.spec.ts',
        '**/connections.spec.ts',
        '**/pages-security.spec.ts',
        '**/notes-journey.spec.ts',
        '**/content-feed.spec.ts',
      ],
    },
    {
      name: 'teardown',
      dependencies: ['journeys'],
      testMatch: '**/user-teardown.spec.ts',
    },
  ],
  ...(isLocalBackend
    ? {
        webServer: [
          {
            command: 'npm start',
            cwd: '../../apps/backend',
            url: 'http://localhost:5000/prod/connectors/oauth',
            reuseExistingServer: true,
            timeout: 60000,
          },
          {
            command: 'npx vite --port 3000 --open false',
            cwd: '../../apps/frontend',
            url: 'http://localhost:3000',
            reuseExistingServer: true,
            timeout: 30000,
          },
        ],
      }
    : {}),
})
