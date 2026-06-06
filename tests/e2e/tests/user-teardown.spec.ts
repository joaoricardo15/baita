/**
 * User Teardown E2E Test
 *
 * Part of the 'teardown' project — runs after all journey specs.
 * Deletes the test user via the SAME centralized endpoint that real users use
 * (Profile → Delete Account → DELETE /user/{userId}).
 *
 * Best-effort: logs errors but doesn't fail the suite. The next run's
 * setup phase will clean up any leftovers via login-first strategy.
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
  test('delete account via API', async ({ request }) => {
    const res = await request.delete(`${API_URL}/user/${userId}`, {
      headers: authHeaders(token),
    })
    const body = await res.json()

    if (!body.success) {
      logResult('Account deletion returned error (non-fatal)', {
        success: body.success,
        message: body.message,
        userId,
      })
    }

    expect(body.success).toBe(true)
    logResult('User deleted', { userId })
  })

  test('verify all resources are gone after deletion', async ({ request }) => {
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

    logResult('Post-delete verification', {
      bots: botsBody.data?.length || 0,
      connections: connectionsBody.data?.length || 0,
      notes: notesBody.data?.length || 0,
    })
  })
})
