/**
 * Visual Verification Tool
 *
 * Not a test — a development tool for inspecting layout changes in a real browser.
 * Opens Playwright Inspector at the target page for interactive exploration.
 *
 * Usage:
 *   VERIFY_PATH=/bots npm run verify
 *   VERIFY_PATH=/bots/abc123 npm run verify
 */
import { test } from '@playwright/test'

test('verify page', async ({ page }) => {
  const targetPath = process.env.VERIFY_PATH || '/bots'
  await page.goto(targetPath)
  await page.waitForLoadState('networkidle')
  await page.pause()
})
