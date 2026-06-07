/**
 * User Teardown E2E Test
 *
 * Part of the 'teardown' project — runs after all journey specs.
 * Deletes the test user via the centralized DELETE /user/{userId} endpoint
 * which handles ALL cleanup: bots, SQS queues, DynamoDB records, Auth0 user.
 *
 * This is the ONLY cleanup mechanism — all resource deletion logic lives
 * in the backend endpoint, not in test scripts.
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

test.describe('User Teardown', () => {
  test('delete account via centralized DELETE /user endpoint', async ({
    request,
  }) => {
    const res = await request.delete(`${API_URL}/user/${userId}`, {
      headers: authHeaders(token),
    })
    const body = await res.json()

    logResult('DELETE /user response', {
      success: body.success,
      message: body.message,
      userId,
    })

    expect(body.success).toBe(true)
  })

  test('verify all resources are gone after deletion', async ({ request }) => {
    await new Promise((r) => setTimeout(r, 3000))

    const botsRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/list`,
      { headers: authHeaders(token), data: {} }
    )
    const botsBody = await botsRes.json()
    expect(botsBody.data || []).toHaveLength(0)

    const connectionsRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/list`,
      { headers: authHeaders(token), data: {} }
    )
    const connectionsBody = await connectionsRes.json()
    expect(connectionsBody.data || []).toHaveLength(0)

    const notesRes = await request.post(
      `${API_URL}/user/${userId}/resource/note/list`,
      { headers: authHeaders(token), data: {} }
    )
    const notesBody = await notesRes.json()
    expect(notesBody.data || []).toHaveLength(0)

    const todosRes = await request.post(
      `${API_URL}/user/${userId}/resource/todo/list`,
      { headers: authHeaders(token), data: {} }
    )
    const todosBody = await todosRes.json()
    expect(todosBody.data || []).toHaveLength(0)

    const contentRes = await request.post(
      `${API_URL}/user/${userId}/resource/content/list`,
      { headers: authHeaders(token), data: {} }
    )
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
