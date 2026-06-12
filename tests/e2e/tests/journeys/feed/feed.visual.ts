/**
 * Content Feed Journey — Visual Regression
 *
 * Mirrors: tests/e2e/tests/content-feed.spec.ts
 * Journey: #3 Content Feed (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Feed page with content cards
 */
import { expect, test } from '@playwright/test'

import { waitForPageReady } from '../helpers'

test.describe('Feed Journey', () => {
  test('feed page — content cards', async ({ page }) => {
    await page.goto('/feed')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('feed-cards.png', {
      fullPage: true,
    })
  })
})
