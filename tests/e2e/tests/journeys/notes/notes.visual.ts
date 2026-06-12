/**
 * Notes Journey — Visual Regression
 *
 * Mirrors: tests/e2e/tests/notes-journey.spec.ts
 * Journey: #5 Notes (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Notes page initial state
 * 2. After creating a note
 */
import { expect, test } from '@playwright/test'

import { API_URL, getApiHeaders, waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Notes Journey', () => {
  let noteId: string

  test.afterAll(async ({ request }) => {
    if (noteId) {
      await request
        .delete(`${API_URL}/data/note/${noteId}`, {
          headers: getApiHeaders(),
        })
        .catch(() => {})
    }
  })

  test('notes page — initial state', async ({ page }) => {
    await page.goto('/notes')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('notes-initial.png', {
      fullPage: true,
    })
  })

  test('notes page — after creating note', async ({ page, request }) => {
    const res = await request.post(`${API_URL}/data/note`, {
      headers: getApiHeaders(),
      data: {
        noteId: `visual-note-${Date.now()}`,
        title: 'Visual regression test note',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })
    const body = await res.json()
    noteId = body.data?.noteId || `visual-note-${Date.now()}`

    await page.goto('/notes')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('notes-with-note.png', {
      fullPage: true,
    })
  })
})
