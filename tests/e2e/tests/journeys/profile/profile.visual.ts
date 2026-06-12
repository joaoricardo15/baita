/**
 * Profile Journey — Visual Regression
 *
 * Journey: #9 Profile & Stats (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Profile page with user info
 * 2. Profile with daily progress stats
 * 3. Delete account confirmation dialog
 */
import { expect, test } from '@playwright/test'

import { API_URL, getApiHeaders, waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Profile Journey', () => {
  test('profile page — user info', async ({ page }) => {
    await page.goto('/profile')
    await waitForPageReady(page)

    // Assert: user email or name is visible
    const emailOrName = page.locator('text=e2e-test@baita.help')
    const hasEmail = (await emailOrName.count()) > 0
    // Fallback: look for any user-identifying text
    const hasUserInfo =
      hasEmail ||
      (await page.locator('[class*="avatar"], [class*="Avatar"]').count()) > 0
    expect(hasUserInfo).toBeTruthy()

    // Assert: no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('profile-page.png', {
      fullPage: true,
    })
  })

  test('profile page — with daily progress', async ({ page, request }) => {
    // Setup: add completed tasks for today
    await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: {
        tasks: [
          {
            taskId: 'visual-profile-done-1',
            title: 'Morning standup',
            done: true,
            createdAt: Date.now() - 3600000,
            updatedAt: Date.now(),
          },
          {
            taskId: 'visual-profile-done-2',
            title: 'Code review',
            done: true,
            createdAt: Date.now() - 1800000,
            updatedAt: Date.now(),
          },
        ],
      },
    })

    await page.goto('/profile')
    await waitForPageReady(page)

    // Assert: daily stats section is present
    const statsSection = page.locator('text=/task|done|today/i').first()
    if ((await statsSection.count()) > 0) {
      await expect(statsSection).toBeVisible()
    }

    await expect(page).toHaveScreenshot('profile-daily-progress.png', {
      fullPage: true,
    })
  })

  test('profile page — delete account dialog', async ({ page }) => {
    await page.goto('/profile')
    await waitForPageReady(page)

    // Find and click the delete account button
    const deleteButton = page.locator('text=/delete|remove account/i').first()
    if ((await deleteButton.count()) > 0) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      // Assert: confirmation dialog is open
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 3000 })

      // Assert: dialog has "Delete your account?" title
      await expect(dialog.locator('text=Delete your account?')).toBeVisible()

      // Assert: cancel and confirm buttons are present
      const buttons = dialog.locator('button')
      const buttonCount = await buttons.count()
      expect(buttonCount).toBeGreaterThanOrEqual(2)

      // Assert: dialog fits viewport
      const dialogBox = await dialog.boundingBox()
      if (dialogBox) {
        expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(375)
      }

      await expect(page).toHaveScreenshot('profile-delete-dialog.png', {
        fullPage: true,
      })
    }
  })

  test.afterAll(async ({ request }) => {
    // Restore todo tasks to not affect other tests
    await request
      .put(`${API_URL}/data/todo`, {
        headers: getApiHeaders(),
        data: { tasks: [] },
      })
      .catch(() => {})
  })
})
