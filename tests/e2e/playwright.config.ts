import { defineConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...val] = line.split('=')
    if (key && !process.env[key]) process.env[key.trim()] = val.join('=').trim()
  }
}

const isLocal = process.env.TEST_ENV === 'local'
const isLocalBackend = isLocal && !process.env.API_URL
const isStrictVisual = !!process.env.VISUAL_STRICT
const skipSetup = !!process.env.SKIP_SETUP

if (isLocalBackend) {
  process.env.API_URL = 'http://localhost:5000/prod'
}

const visualThreshold = isStrictVisual ? 0.01 : 0.05

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
      testDir: './tests/journeys',
      testMatch: '**/*.spec.ts',
      use: {
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'connectors',
      testDir: './tests/connectors',
      testMatch: '**/*.spec.ts',
      use: {
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'visual',
      testDir: './tests/journeys',
      testMatch: '**/*.visual.ts',
      ...(skipSetup ? {} : { dependencies: ['setup'] }),
      use: {
        storageState: 'playwright/.auth/user.json',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
      },
      snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{arg}{ext}',
      snapshotDir: './tests/journeys',
      expect: {
        toHaveScreenshot: {
          maxDiffPixelRatio: visualThreshold,
          animations: 'disabled',
        },
      },
    },
  ],
  ...(isLocalBackend
    ? {
        webServer: [
          {
            command: 'npm start',
            cwd: '../../apps/backend',
            url: 'http://localhost:5000/prod/oauth/callback',
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
