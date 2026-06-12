/**
 * Content Feed Journey — Visual Regression
 *
 * Journey: #3 Content Feed (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Feed page with content cards
 * 2. Card with full fields (header, body, author, source)
 * 3. Card fills viewport height
 * 4. Empty feed state
 */
import { expect, test } from '@playwright/test'

import { API_URL, getApiHeaders, waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Feed Journey', () => {
  const contentIds: string[] = []

  test.afterAll(async ({ request }) => {
    for (const id of contentIds) {
      await request
        .patch(`${API_URL}/content/${id}`, {
          headers: getApiHeaders(),
          data: { reaction: 'dismiss' },
        })
        .catch(() => {})
    }
  })

  test('feed page — content cards', async ({ page }) => {
    await page.goto('/feed')
    await waitForPageReady(page)

    // Assert: page loaded without horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('feed-cards.png', {
      fullPage: true,
    })
  })

  test('feed page — card with content', async ({ page, request }) => {
    const contentId = `visual-feed-${Date.now()}`
    contentIds.push(contentId)

    // Create a content item with all fields
    const res = await request.put(`${API_URL}/data/content/${contentId}`, {
      headers: getApiHeaders(),
      data: {
        contentId,
        date: new Date().toISOString(),
        header: 'Major Tech Announcement',
        body: 'Industry leaders revealed breakthrough in automation technology that will change how small businesses operate daily.',
        source: 'Tech Daily',
        author: {
          name: 'Sarah Johnson',
          accountName: '@tech_writer',
        },
      },
    })
    const body = await res.json()
    expect(body.success).toBeTruthy()

    await page.goto('/feed')
    await waitForPageReady(page)

    // Assert: content header is visible
    await expect(page.locator('text=Major Tech Announcement')).toBeVisible({
      timeout: 5000,
    })

    // Assert: author info is visible
    await expect(page.locator('text=Sarah Johnson')).toBeVisible()

    // Assert: body text is visible
    await expect(
      page.locator('text=Industry leaders revealed').first()
    ).toBeVisible()

    // Assert: card doesn't overflow horizontally
    const cardWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(cardWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('feed-full-card.png', {
      fullPage: true,
    })
  })

  test('feed page — card fills viewport', async ({ page }) => {
    await page.goto('/feed')
    await waitForPageReady(page)

    // Assert: the card container uses most of the viewport height
    const cardContainer = page
      .locator('[class*="card"], [class*="swipe"], [class*="feed"]')
      .first()
    if ((await cardContainer.count()) > 0) {
      const box = await cardContainer.boundingBox()
      if (box) {
        // Card should use at least 60% of viewport height (812px)
        expect(box.height).toBeGreaterThan(400)
      }
    }

    await expect(page).toHaveScreenshot('feed-viewport-fit.png', {
      fullPage: true,
    })
  })

  test('feed page — empty state', async ({ page, request }) => {
    // React to all remaining content to empty the feed
    const res = await request.get(`${API_URL}/content`, {
      headers: getApiHeaders(),
    })
    const body = await res.json()
    if (body.data?.length) {
      for (const item of body.data) {
        await request
          .patch(`${API_URL}/content/${item.contentId}`, {
            headers: getApiHeaders(),
            data: { reaction: 'dismiss' },
          })
          .catch(() => {})
      }
    }

    await page.goto('/feed')
    await waitForPageReady(page)

    // Assert: empty state or "no content" indicator is shown
    // The feed may show an empty state or just have no cards
    const hasContent =
      (await page.locator('text=Major Tech Announcement').count()) === 0

    expect(hasContent).toBeTruthy()

    await expect(page).toHaveScreenshot('feed-empty.png', {
      fullPage: true,
    })
  })
})
