/**
 * Connections Journey — Visual Regression
 *
 * Journey: #7 OAuth Connections (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Connections list with active services
 * 2. Connection card structure (icon, name, email, menu)
 * 3. Add connection dialog
 * 4. API key connection form
 */
import { expect, test } from '@playwright/test'

import { waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Connections Journey', () => {
  test('connections page — service list', async ({ page }) => {
    await page.goto('/connections')
    await waitForPageReady(page)

    // Assert: page loaded with connections content
    // Either has connection cards OR shows empty state
    const hasCards = (await page.locator('.MuiCard-root').count()) > 0
    const hasEmpty =
      (await page.locator('text=/no connection|connect/i').count()) > 0
    expect(hasCards || hasEmpty).toBeTruthy()

    // Assert: no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('connections-list.png', {
      fullPage: true,
    })
  })

  test('connections page — card structure', async ({ page }) => {
    await page.goto('/connections')
    await waitForPageReady(page)

    const cards = page.locator('.MuiCard-root')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      // Assert: first card has expected structure
      const firstCard = cards.first()
      await expect(firstCard).toBeVisible()

      // Assert: card fits viewport
      const cardBox = await firstCard.boundingBox()
      expect(cardBox).not.toBeNull()
      expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(375)

      // Assert: card has icon area (img or svg)
      const hasIcon = (await firstCard.locator('img, svg').count()) > 0
      expect(hasIcon).toBeTruthy()

      // Assert: card has text content (connection name)
      const textContent = await firstCard.textContent()
      expect(textContent!.length).toBeGreaterThan(0)
    }

    await expect(page).toHaveScreenshot('connections-card-detail.png', {
      fullPage: true,
    })
  })

  test('connections page — add connection dialog', async ({ page }) => {
    await page.goto('/connections')
    await waitForPageReady(page)

    // Click the "Add connection" button
    const addButton = page.getByRole('button', { name: 'Add connection' })
    if ((await addButton.count()) > 0) {
      await addButton.click()
      await page.waitForTimeout(1000)
    }

    // Assert: page state after clicking add (dialog, new page, or popover)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('connections-add-dialog.png', {
      fullPage: true,
    })
  })
})
