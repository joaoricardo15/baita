/**
 * Connections Journey — Visual Regression
 *
 * Mirrors: tests/e2e/tests/connections.spec.ts
 * Journey: #7 OAuth Connections (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Connections list with active services
 */
import { expect, test } from '@playwright/test'

import { waitForPageReady } from '../helpers'

test.describe('Connections Journey', () => {
  test('connections page — service list', async ({ page }) => {
    await page.goto('/connections')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('connections-list.png', {
      fullPage: true,
    })
  })
})
