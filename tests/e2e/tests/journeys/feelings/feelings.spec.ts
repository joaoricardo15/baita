/**
 * Feelings Journey E2E Tests
 *
 * User Journey: Feelings Management
 * Tests the full feelings lifecycle via the generic resource API:
 * - List feelings
 * - Create a feeling
 * - Read the created feeling
 * - Update feeling content
 * - Delete the feeling
 * - Verify cleanup
 *
 * Part of the 'journeys' project — depends on user-lifecycle.spec.ts setup.
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData, logResult } from '../../helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
})

test.describe.configure({ mode: 'serial' })

test.describe('Feelings Lifecycle', () => {
  const feelingId = `e2e-feeling-${Date.now()}`

  test.afterAll(async ({ request }) => {
    await request
      .delete(`${API_URL}/data/feeling/${feelingId}`, {
        headers: authHeaders(token),
      })
      .catch(() => {})
  })

  test('list feelings returns array', async ({ request }) => {
    const res = await request.get(`${API_URL}/data/feeling`, {
      headers: authHeaders(token),
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    logResult('Feelings list', { count: body.data.length })
  })

  test('create a new feeling', async ({ request }) => {
    const res = await request.put(`${API_URL}/data/feeling/${feelingId}`, {
      headers: authHeaders(token),
      data: {
        feelingId,
        content: 'E2E Test Feeling — had a vivid dream about flying',
        mood: 'happy',
        tags: ['dream'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Feeling created', { feelingId })
  })

  test('read the created feeling', async ({ request }) => {
    const res = await request.get(`${API_URL}/data/feeling/${feelingId}`, {
      headers: authHeaders(token),
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.feelingId).toBe(feelingId)
    expect(body.data.content).toBe(
      'E2E Test Feeling — had a vivid dream about flying'
    )
    expect(body.data.mood).toBe('happy')
    expect(body.data.tags).toEqual(['dream'])
    logResult('Feeling read', { content: body.data.content })
  })

  test('update feeling content', async ({ request }) => {
    const res = await request.patch(`${API_URL}/data/feeling/${feelingId}`, {
      headers: authHeaders(token),
      data: {
        feelingId,
        content: 'E2E Test Feeling (Updated) — the dream was about mountains',
        mood: 'calm',
        updatedAt: Date.now(),
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)

    const readRes = await request.get(`${API_URL}/data/feeling/${feelingId}`, {
      headers: authHeaders(token),
    })
    const readBody = await readRes.json()
    expect(readBody.data.content).toBe(
      'E2E Test Feeling (Updated) — the dream was about mountains'
    )
    expect(readBody.data.mood).toBe('calm')
    logResult('Feeling updated', { content: readBody.data.content })
  })

  test('delete the feeling', async ({ request }) => {
    const res = await request.delete(`${API_URL}/data/feeling/${feelingId}`, {
      headers: authHeaders(token),
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Feeling deleted', { feelingId })
  })

  test('verify feeling is gone', async ({ request }) => {
    const res = await request.get(`${API_URL}/data/feeling/${feelingId}`, {
      headers: authHeaders(token),
    })
    const body = await res.json()
    expect(body.data).toBeFalsy()
    logResult('Feeling verified deleted', { feelingId })
  })
})
