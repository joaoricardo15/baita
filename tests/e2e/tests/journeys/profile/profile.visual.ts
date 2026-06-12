/**
 * Profile Journey — Visual Regression
 *
 * Journey: #9 Profile & Stats (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Profile page with user info and stats
 */
import { expect, test } from '@playwright/test'

import { waitForPageReady } from '../helpers'

test.describe('Profile Journey', () => {
  test('profile page', async ({ page }) => {
    await page.goto('/profile')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('profile-page.png', {
      fullPage: true,
    })
  })
})
