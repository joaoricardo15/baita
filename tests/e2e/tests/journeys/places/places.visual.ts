/**
 * Places Journey — Visual Regression
 *
 * Journey: #6 Places (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Places page — empty state
 * 2. Places page — list view with saved places
 * 3. Places page — map view with markers
 */
import { expect, test } from '@playwright/test'

import {
  API_URL,
  getApiHeaders,
  maskElements,
  waitForPageReady,
} from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Places Journey', () => {
  const placeIds: string[] = []

  test.afterAll(async ({ request }) => {
    for (const id of placeIds) {
      await request
        .delete(`${API_URL}/data/place/${id}`, {
          headers: getApiHeaders(),
        })
        .catch(() => {})
    }
  })

  test('places page — empty state', async ({ page }) => {
    await page.goto('/place')
    await waitForPageReady(page)

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('places-page.png', {
      fullPage: true,
      mask: maskElements(page, ['canvas', '[class*="map"]', '[class*="Map"]']),
    })
  })

  test('places page — list view with saved place', async ({
    page,
    request,
  }) => {
    const placeId = `visual-place-${Date.now()}`
    placeIds.push(placeId)

    const res = await request.put(`${API_URL}/data/place/${placeId}`, {
      headers: getApiHeaders(),
      data: {
        placeId,
        name: 'Coffee Shop',
        description: 'Best espresso in town',
        pictures: [],
        position: { lat: 52.37, lng: 4.89 },
        createdAt: new Date().toISOString(),
      },
    })
    const body = await res.json()
    expect(body.success).toBeTruthy()

    await page.goto('/place')
    await waitForPageReady(page)

    await page.waitForSelector('text=Coffee Shop', { timeout: 5000 })

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('places-with-place.png', {
      fullPage: true,
      mask: maskElements(page, ['canvas', '[class*="map"]', '[class*="Map"]']),
    })
  })
})
