/**
 * Notes Journey E2E Tests
 *
 * User Journey: Notes Management
 * Tests the full notes lifecycle via the generic resource API:
 * - List notes
 * - Create a note
 * - Read the created note
 * - Update note content
 * - Delete the note
 * - Verify cleanup
 *
 * Part of the 'journeys' project — depends on user-lifecycle.spec.ts setup.
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData, logResult } from './helpers'

let token: string
let userId: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
  userId = data.userId
})

test.describe.configure({ mode: 'serial' })

test.describe('Notes Lifecycle', () => {
  const noteId = `e2e-note-${Date.now()}`

  test.afterAll(async ({ request }) => {
    await request
      .post(`${API_URL}/user/${userId}/resource/note/delete/${noteId}`, {
        headers: authHeaders(token),
        data: {},
      })
      .catch(() => {})
  })

  test('list notes returns array', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/note/list`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    logResult('Notes list', { count: body.data.length })
  })

  test('create a new note', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/note/create/${noteId}`,
      {
        headers: authHeaders(token),
        data: {
          noteId,
          title: 'E2E Test Note',
          content: 'This note was created by the E2E test suite.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Note created', { noteId })
  })

  test('read the created note', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/note/read/${noteId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.noteId).toBe(noteId)
    expect(body.data.title).toBe('E2E Test Note')
    expect(body.data.content).toBe(
      'This note was created by the E2E test suite.'
    )
    logResult('Note read', { title: body.data.title })
  })

  test('update note content', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/note/update/${noteId}`,
      {
        headers: authHeaders(token),
        data: {
          noteId,
          title: 'E2E Test Note (Updated)',
          content: 'This note was updated by the E2E test suite.',
          updatedAt: Date.now(),
        },
      }
    )
    const body = await res.json()
    expect(body.success).toBe(true)

    const readRes = await request.post(
      `${API_URL}/user/${userId}/resource/note/read/${noteId}`,
      { headers: authHeaders(token), data: {} }
    )
    const readBody = await readRes.json()
    expect(readBody.data.title).toBe('E2E Test Note (Updated)')
    expect(readBody.data.content).toBe(
      'This note was updated by the E2E test suite.'
    )
    logResult('Note updated', { title: readBody.data.title })
  })

  test('delete the note', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/note/delete/${noteId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Note deleted', { noteId })
  })

  test('verify note is gone', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/note/read/${noteId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.data).toBeFalsy()
    logResult('Note verified deleted', { noteId })
  })
})
