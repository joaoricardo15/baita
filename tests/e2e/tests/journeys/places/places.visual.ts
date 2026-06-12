/**
 * Places Journey — Visual Regression
 *
 * Journey: #6 Places (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Places page (map masked — external tile loading is non-deterministic)
 */
import { expect, test } from '@playwright/test'

import { maskElements, waitForPageReady } from '../helpers'

test.describe('Places Journey', () => {
  test('places page', async ({ page }) => {
    await page.goto('/place')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('places-page.png', {
      fullPage: true,
      mask: maskElements(page, ['canvas', '[class*="map"]', '[class*="Map"]']),
    })
  })
})
