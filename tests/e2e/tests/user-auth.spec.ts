/**
 * User Authentication E2E Tests
 *
 * Tests the Baita user login flow via Auth0.
 * This is SEPARATE from OAuth connector auth (partner connections).
 *
 * Use cases covered:
 * - Unauthenticated users see login UI and can't access protected resources
 * - Login button triggers Auth0 redirect (away from app)
 * - Auth callback URLs with code/state/error params render the app (no crash)
 * - Service worker doesn't intercept auth callbacks (passes through to network)
 * - API validates tokens correctly (accepts valid, rejects invalid, returns CORS)
 */
import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const API_URL = process.env.API_URL || 'https://api.baita.help'
const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

let token: string
let userId: string

test.beforeAll(() => {
  if (fs.existsSync(tokenFile)) {
    const data = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'))
    token = data.accessToken
    userId = data.userId
  }
})

test.describe('Unauthenticated State', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('landing page shows login button', async ({ page, baseURL }) => {
    await page.goto(baseURL!)
    const loginButton = page.locator(
      'button:has-text("Log in"), button:has-text("Entrar")'
    )
    await expect(loginButton).toBeVisible({ timeout: 10000 })
  })

  test('protected routes redirect unauthenticated users', async ({
    page,
    baseURL,
  }) => {
    await page.goto(`${baseURL}/bots`)
    const loginVisible = await page
      .locator('button:has-text("Log in"), button:has-text("Entrar")')
      .isVisible()
      .catch(() => false)
    const redirectedToAuth0 =
      page.url().includes('auth0.com') || page.url().includes('auth.baita.help')
    expect(loginVisible || redirectedToAuth0).toBe(true)
  })

  test('API rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/test/content`)
    expect(res.status()).toBe(401)
  })
})

test.describe('Login Redirect', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login button navigates to Auth0', async ({ page, baseURL }) => {
    await page.goto(baseURL!)
    const loginButton = page.locator(
      'button:has-text("Log in"), button:has-text("Entrar")'
    )
    await loginButton.click()
    await page.waitForURL((url) => !url.href.startsWith(baseURL!), {
      timeout: 15000,
    })
    expect(page.url()).not.toBe(baseURL)
  })
})

test.describe('Auth Callback Handling', () => {
  test('callback with code param renders app (not blank page)', async ({
    page,
    baseURL,
  }) => {
    const response = await page.goto(
      `${baseURL}?code=test_code&state=test_state`
    )
    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('#root')).toBeAttached({ timeout: 10000 })
  })

  test('service worker passes through auth callbacks', async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL!)
    await page.waitForTimeout(2000)
    const response = await page.goto(`${baseURL}?code=test&state=test`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('#root')).toBeAttached({ timeout: 5000 })
  })

  test('callback with error param renders gracefully', async ({
    page,
    baseURL,
  }) => {
    const response = await page.goto(
      `${baseURL}?error=access_denied&error_description=User+denied`
    )
    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('#root')).toBeAttached({ timeout: 10000 })
  })
})

test.describe('API Token Validation', () => {
  test('valid token returns 200', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/list`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {},
      }
    )
    expect(res.status()).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  test('invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/test/content`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    })
    expect(res.status()).toBe(401)
  })

  test('error responses include CORS headers', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/test/content`, {
      headers: {
        Authorization: 'Bearer bad',
        Origin: 'https://www.baita.help',
      },
    })
    expect(res.status()).toBe(401)
    expect(res.headers()['access-control-allow-origin']).toBe(
      'https://www.baita.help'
    )
  })
})
