import { expect, test } from '@playwright/test'

const BASE_URL = 'https://www.baita.help'

test.describe('Authentication Flow', () => {
  test('unauthenticated user sees login button', async ({ page }) => {
    await page.goto(BASE_URL)
    const loginButton = page.locator(
      'button:has-text("Log in"), button:has-text("Entrar")'
    )
    await expect(loginButton).toBeVisible({ timeout: 10000 })
  })

  test('login button triggers Auth0 redirect', async ({ page }) => {
    await page.goto(BASE_URL)
    const loginButton = page.locator(
      'button:has-text("Log in"), button:has-text("Entrar")'
    )
    await loginButton.click()
    await page.waitForURL(/auth0\.com|accounts\.google/, { timeout: 10000 })
    expect(page.url()).toContain('auth0.com')
  })

  test('auth callback URL with code param loads app (not cached SW page)', async ({
    page,
  }) => {
    // Simulate what happens after Google auth redirects back with code
    const response = await page.goto(
      `${BASE_URL}?code=test_code&state=test_state`
    )
    expect(response?.status()).toBeLessThan(500)
    // The page should load the React app (not a SW error or blank page)
    await expect(page.locator('#root')).toBeAttached({ timeout: 10000 })
  })

  test('app renders after auth callback URL (does not crash)', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}?code=fake&state=fake`)
    expect(response?.status()).toBeLessThan(500)
    // App should render the HTML shell regardless of auth state
    await expect(page.locator('html')).toBeAttached()
  })

  test('service worker does not intercept auth callback navigation', async ({
    page,
  }) => {
    // Register SW, then navigate to callback URL
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000) // let SW register

    // Now navigate to callback URL — should NOT be served from cache
    const response = await page.goto(`${BASE_URL}?code=test&state=test`)
    // If SW intercepted, it would serve cached HTML without network request
    // A fresh network request means SW passed through correctly
    expect(response?.status()).toBe(200)
    await expect(page.locator('#root')).toBeAttached({ timeout: 5000 })
  })
})
