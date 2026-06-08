/**
 * User Teardown E2E Test
 *
 * Part of the 'teardown' project — runs after all journey specs.
 * Deletes the test user via the centralized DELETE /user endpoint
 * which handles ALL cleanup: bots, SQS queues, DynamoDB records, Auth0 user.
 *
 * This is the ONLY cleanup mechanism — all resource deletion logic lives
 * in the backend endpoint, not in test scripts.
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData, logResult } from './helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
})

test.describe.configure({ mode: 'serial' })

test.describe('User Teardown', () => {
  test('delete account via centralized DELETE /user endpoint', async ({
    request,
  }) => {
    const res = await request.delete(`${API_URL}/user`, {
      headers: authHeaders(token),
    })
    const body = await res.json()

    logResult('DELETE /user response', {
      success: body.success,
      message: body.message,
    })

    expect(body.success).toBe(true)
  })

  test('verify all resources are gone after deletion', async ({ request }) => {
    await new Promise((r) => setTimeout(r, 3000))

    const botsRes = await request.get(`${API_URL}/bots`, {
      headers: authHeaders(token),
    })
    const botsBody = await botsRes.json()
    expect(botsBody.data || []).toHaveLength(0)

    const connectionsRes = await request.get(`${API_URL}/connections`, {
      headers: authHeaders(token),
    })
    const connectionsBody = await connectionsRes.json()
    expect(connectionsBody.data || []).toHaveLength(0)

    const notesRes = await request.get(`${API_URL}/data/note`, {
      headers: authHeaders(token),
    })
    const notesBody = await notesRes.json()
    expect(notesBody.data || []).toHaveLength(0)

    const todosRes = await request.get(`${API_URL}/data/todo`, {
      headers: authHeaders(token),
    })
    const todosBody = await todosRes.json()
    expect(todosBody.data || []).toHaveLength(0)

    const contentRes = await request.get(`${API_URL}/data/content`, {
      headers: authHeaders(token),
    })
    const contentBody = await contentRes.json()
    expect(contentBody.data || []).toHaveLength(0)

    logResult('Post-delete verification — all resources deleted', {
      bots: botsBody.data?.length || 0,
      connections: connectionsBody.data?.length || 0,
      notes: notesBody.data?.length || 0,
      todos: todosBody.data?.length || 0,
      content: contentBody.data?.length || 0,
    })
  })
})
