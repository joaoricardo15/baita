/**
 * Authentication Journey — Visual Regression
 *
 * Mirrors: tests/e2e/tests/user-lifecycle.spec.ts (landing page only)
 * Journey: #1 Authentication (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Landing page (unauthenticated visitor)
 *
 * Note: Uses a fresh context without storageState to see the logged-out state.
 */
import { expect, test } from '@playwright/test'

import { waitForPageReady } from '../helpers'

test.describe('Auth Journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('landing page — unauthenticated', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
    })
  })
})
