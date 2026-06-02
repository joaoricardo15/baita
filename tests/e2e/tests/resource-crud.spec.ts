/**
 * Resource CRUD & Bot Lifecycle E2E Tests
 *
 * User Journeys: To-Do, Bots, Notes, Content Feed
 * Tests the API contracts that back the core product features:
 * - Content feed endpoint (backing the Feed page)
 * - Todo resource listing (backing the To-Do page)
 * - Bot resource listing (backing the Bots page)
 * - Generic resource CRUD lifecycle (backing Notes, Places, etc.)
 * - Bot lifecycle: create → logs → read → delete
 * - Error handling: invalid operations return structured errors
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData } from './helpers'

let token: string
let userId: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
  userId = data.userId
})

test.describe('Content Feed', () => {
  test('GET /content returns valid response', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success')
  })
})

test.describe('Todo Page', () => {
  test('list todo returns array', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/list`,
      { headers: authHeaders(token), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

test.describe('Bots Page', () => {
  test('list bots returns array', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/bot/list`,
      { headers: authHeaders(token), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

test.describe('Resource CRUD Lifecycle', () => {
  const resourceId = `smoke-${Date.now()}`

  test('create resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/create/${resourceId}`,
      {
        headers: authHeaders(token),
        data: { title: 'Smoke Test', body: 'Created by E2E', ts: Date.now() },
      }
    )
    expect(res.status()).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  test('read resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/read/${resourceId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Smoke Test')
  })

  test('update resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/update/${resourceId}`,
      {
        headers: authHeaders(token),
        data: { title: 'Updated', body: 'Modified' },
      }
    )
    expect((await res.json()).success).toBe(true)
  })

  test('list includes resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/list`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('delete resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/delete/${resourceId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await res.json()).success).toBe(true)
  })

  test('read after delete returns empty', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/read/${resourceId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.data).toBeFalsy()
  })
})

test.describe('Bot Lifecycle', () => {
  let botId: string
  let apiId: string

  test.afterAll(async ({ request }) => {
    if (botId && apiId) {
      await request
        .delete(`${API_URL}/user/${userId}/bot/${botId}/api/${apiId}`, {
          headers: authHeaders(token),
        })
        .catch(() => {})
    }
  })

  test('create bot', async ({ request }) => {
    const res = await request.post(`${API_URL}/user/${userId}/bot`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.botId).toBeTruthy()
    expect(body.data.triggerUrl).toMatch(/^https:\/\//)
    botId = body.data.botId
    apiId = body.data.apiId
  })

  test('get bot logs', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/user/${userId}/bot/${botId}/logs`,
      { headers: authHeaders(token) }
    )
    expect(res.status()).toBe(200)
  })

  test('read bot from resource API', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.botId).toBe(botId)
  })

  test('delete bot', async ({ request }) => {
    const res = await request.delete(
      `${API_URL}/user/${userId}/bot/${botId}/api/${apiId}`,
      { headers: authHeaders(token) }
    )
    expect((await res.json()).success).toBe(true)
  })
})

test.describe('Error Handling', () => {
  test('invalid operation returns structured error', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/invalid-op`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBeTruthy()
  })
})
