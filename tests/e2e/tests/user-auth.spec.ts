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

const BASE_URL = 'https://www.baita.help'
const API_URL = 'https://api.baita.help'

let token: string

test.beforeAll(() => {
  token = process.env.SMOKE_TEST_TOKEN || ''
  if (!token) throw new Error('SMOKE_TEST_TOKEN env var is required')
})

test.describe('Unauthenticated State', () => {
  test('landing page shows login button', async ({ page }) => {
    await page.goto(BASE_URL)
    const loginButton = page.locator(
      'button:has-text("Log in"), button:has-text("Entrar")'
    )
    await expect(loginButton).toBeVisible({ timeout: 10000 })
  })

  test('protected routes redirect unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE_URL}/bots`)
    const loginVisible = await page
      .locator('button:has-text("Log in"), button:has-text("Entrar")')
      .isVisible()
      .catch(() => false)
    const redirectedToAuth0 = page.url().includes('auth0.com')
    expect(loginVisible || redirectedToAuth0).toBe(true)
  })

  test('API rejects unauthenticated requests with 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/test/content`)
    expect(res.status()).toBe(401)
  })
})

test.describe('Login Redirect', () => {
  test('login button navigates to Auth0', async ({ page }) => {
    await page.goto(BASE_URL)
    const loginButton = page.locator(
      'button:has-text("Log in"), button:has-text("Entrar")'
    )
    await loginButton.click()
    await page.waitForURL((url) => !url.href.startsWith(BASE_URL), {
      timeout: 15000,
    })
    expect(page.url()).not.toBe(BASE_URL)
  })
})

test.describe('Auth Callback Handling', () => {
  test('callback with code param renders app (not blank page)', async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}?code=test_code&state=test_state`
    )
    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('#root')).toBeAttached({ timeout: 10000 })
  })

  test('service worker passes through auth callbacks', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)
    const response = await page.goto(`${BASE_URL}?code=test&state=test`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('#root')).toBeAttached({ timeout: 5000 })
  })

  test('callback with error param renders gracefully', async ({ page }) => {
    const response = await page.goto(
      `${BASE_URL}?error=access_denied&error_description=User+denied`
    )
    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('#root')).toBeAttached({ timeout: 10000 })
  })
})

test.describe('API Token Validation', () => {
  test('valid smoke token returns 200', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/smoke-test-ci/resource/todo/list`,
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
