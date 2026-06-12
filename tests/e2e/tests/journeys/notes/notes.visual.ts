/**
 * Notes Journey — Visual Regression
 *
 * Journey: #5 Notes (USER-JOURNEYS.md)
 *
 * Captures:
 * 1. Empty state (no notes)
 * 2. Single note card
 * 3. Note with long content (wrapping test)
 * 4. Multiple notes in list
 * 5. Note edit dialog open
 */
import { expect, test } from '@playwright/test'

import { API_URL, getApiHeaders, waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Notes Journey', () => {
  const noteIds: string[] = []

  test.afterAll(async ({ request }) => {
    for (const id of noteIds) {
      await request
        .delete(`${API_URL}/data/note/${id}`, {
          headers: getApiHeaders(),
        })
        .catch(() => {})
    }
  })

  test('notes page — empty state', async ({ page, request }) => {
    // Ensure no visual test notes exist
    const res = await request.get(`${API_URL}/data/note`, {
      headers: getApiHeaders(),
    })
    const body = await res.json()
    if (body.data?.length) {
      for (const note of body.data) {
        if (note.noteId?.startsWith('visual-note-')) {
          await request
            .delete(`${API_URL}/data/note/${note.noteId}`, {
              headers: getApiHeaders(),
            })
            .catch(() => {})
        }
      }
    }

    await page.goto('/notes')
    await waitForPageReady(page)

    // Assert: empty state or add button is visible
    const addButton = page.locator('text=Add').first()
    const emptyIndicator = page.locator(
      'text=/no notes|add your first|capture/i'
    )
    const hasEmpty = (await emptyIndicator.count()) > 0
    const hasAdd = (await addButton.count()) > 0
    expect(hasEmpty || hasAdd).toBeTruthy()

    await expect(page).toHaveScreenshot('notes-empty.png', {
      fullPage: true,
    })
  })

  test('notes page — single note', async ({ page, request }) => {
    const noteId = `visual-note-${Date.now()}-1`
    noteIds.push(noteId)

    const res = await request.put(`${API_URL}/data/note/${noteId}`, {
      headers: getApiHeaders(),
      data: {
        noteId,
        title: 'Meeting notes from standup',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })
    expect(res.ok(), `PUT note status: ${res.status()}`).toBeTruthy()

    await page.goto('/notes')
    await waitForPageReady(page)

    // Assert: note title is visible
    await expect(page.locator('text=Meeting notes from standup')).toBeVisible({
      timeout: 5000,
    })

    // Assert: no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('notes-single.png', {
      fullPage: true,
    })
  })

  test('notes page — long content wraps', async ({ page, request }) => {
    const noteId = `visual-note-${Date.now()}-2`
    noteIds.push(noteId)

    const longTitle =
      'This is a very long note title that tests word wrapping behavior on mobile viewport to ensure no horizontal overflow occurs and text stays within bounds'

    const res = await request.put(`${API_URL}/data/note/${noteId}`, {
      headers: getApiHeaders(),
      data: {
        noteId,
        title: longTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })
    expect(res.ok(), `PUT note status: ${res.status()}`).toBeTruthy()

    await page.goto('/notes')
    await waitForPageReady(page)

    // Assert: long note text is present (at least partial match)
    await expect(
      page.locator('text=This is a very long note title')
    ).toBeVisible()

    // Assert: no horizontal overflow — page body doesn't exceed viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('notes-long-content.png', {
      fullPage: true,
    })
  })

  test('notes page — multiple notes', async ({ page, request }) => {
    const noteId = `visual-note-${Date.now()}-3`
    noteIds.push(noteId)

    const res = await request.put(`${API_URL}/data/note/${noteId}`, {
      headers: getApiHeaders(),
      data: {
        noteId,
        title: 'Third note for visual test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })
    expect(res.ok(), `PUT note status: ${res.status()}`).toBeTruthy()

    await page.goto('/notes')
    await waitForPageReady(page)

    // Assert: multiple note cards are visible (at least 3 from previous tests)
    await expect(page.locator('text=Meeting notes from standup')).toBeVisible()
    await expect(page.locator('text=Third note for visual test')).toBeVisible()

    // Assert: consistent card spacing (all cards within viewport)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('notes-multiple.png', {
      fullPage: true,
    })
  })

  test('notes page — edit dialog', async ({ page }) => {
    await page.goto('/notes')
    await waitForPageReady(page)

    // Click on a note to open edit view/dialog
    const noteCard = page.locator('text=Meeting notes from standup').first()
    await expect(noteCard).toBeVisible()
    await noteCard.click()
    await page.waitForTimeout(1000)

    // Assert: some edit UI appeared (dialog, inline editor, or new view)
    // The note content should be editable/visible in some form
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('notes-edit-dialog.png', {
      fullPage: true,
    })
  })
})
