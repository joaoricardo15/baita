import { expect, test } from '@playwright/test'

const BASE_URL = 'https://www.baita.help'

test.describe('Bot Page — AI Assistant Tab', () => {
  test('bot page shows AI Assistant tab (visible even when disabled)', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/bots`)
    await page.waitForTimeout(3000)

    const aiTab = page.locator('button[role="tab"]:has-text("AI Assistant")')
    const builderTab = page.locator('button[role="tab"]:has-text("Builder")')

    const hasBot = await page
      .locator('[data-testid="bot-card"], a[href*="/bots/"]')
      .count()

    if (hasBot > 0) {
      await page
        .locator('[data-testid="bot-card"], a[href*="/bots/"]')
        .first()
        .click()
      await page.waitForTimeout(2000)

      await expect(builderTab).toBeVisible()
      await expect(aiTab).toBeVisible()
    }
  })

  test('AI Assistant tab shows info icon when Chrome AI unavailable', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/bots`)
    await page.waitForTimeout(3000)

    const hasBot = await page
      .locator('[data-testid="bot-card"], a[href*="/bots/"]')
      .count()

    if (hasBot > 0) {
      await page
        .locator('[data-testid="bot-card"], a[href*="/bots/"]')
        .first()
        .click()
      await page.waitForTimeout(2000)

      const aiTab = page.locator('button[role="tab"]:has-text("AI Assistant")')
      if (await aiTab.isVisible()) {
        const isDisabled = await aiTab.getAttribute('aria-disabled')
        if (isDisabled === 'true') {
          const infoIcon = aiTab.locator('svg[data-testid="InfoIcon"]')
          await expect(infoIcon).toBeVisible()
        }
      }
    }
  })
})
