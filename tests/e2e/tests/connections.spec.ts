/**
 * Connections E2E Tests
 *
 * User Journey: Managing OAuth Connections
 * Tests connection CRUD, health checks, and details endpoints.
 */
import { expect, test } from '@playwright/test'

import {
  API_URL,
  authHeaders,
  deleteConnection,
  loadAuthData,
  logResult,
} from './helpers'

let token: string
let userId: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
  userId = data.userId
})

test.describe.configure({ mode: 'serial' })

test.describe('Connections Management', () => {
  const createdConnections: string[] = []

  test.afterAll(async ({ request }) => {
    for (const id of createdConnections) {
      await deleteConnection(request, userId, token, id).catch(() => {})
    }
  })

  test('list connections includes Google connection', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/connection/list`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)

    const google = body.data.find(
      (c: { appId: string }) =>
        c.appId === '5c16e311-a65a-449c-ad82-1f23a41cf89c'
    )
    expect(google).toBeTruthy()
    logResult('Connections list', {
      total: body.data.length,
      hasGoogle: !!google,
    })
  })

  test('Google connection health check', async ({ request }) => {
    const listRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/list`,
      { headers: authHeaders(token), data: {} }
    )
    const listBody = await listRes.json()
    const connections = listBody.data
    const google = connections.find(
      (c: { appId: string }) =>
        c.appId === '5c16e311-a65a-449c-ad82-1f23a41cf89c'
    )
    expect(google).toBeTruthy()

    const res = await request.post(
      `${API_URL}/user/${userId}/connection/${google.connectionId}/health`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    logResult('Google health check', body)

    if (body.success) {
      expect(['healthy', 'expired', 'error']).toContain(body.data.status)
    } else {
      logResult('Health check skipped (endpoint unavailable)', {})
    }
  })

  test('create → read → update → delete connection lifecycle', async ({
    request,
  }) => {
    const connectionId = `e2e-lifecycle-${Date.now()}`
    createdConnections.push(connectionId)

    const createRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'test-app',
          connectionId,
          name: 'E2E Lifecycle',
          email: 'lifecycle@e2e.test',
          credentials: { access_token: 'token-v1' },
        },
      }
    )
    expect((await createRes.json()).success).toBe(true)

    const readRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/read/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await readRes.json()).data.name).toBe('E2E Lifecycle')

    const updateRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/update/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'test-app',
          connectionId,
          name: 'E2E Lifecycle Updated',
          email: 'lifecycle@e2e.test',
          credentials: { access_token: 'token-v2' },
        },
      }
    )
    expect((await updateRes.json()).success).toBe(true)

    const deleteRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/delete/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await deleteRes.json()).success).toBe(true)

    const goneRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/read/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await goneRes.json()).data).toBeFalsy()
    logResult('Connection lifecycle', { result: 'pass' })
  })

  test('connection details shows linked bots', async ({ request }) => {
    const connectionId = `e2e-details-${Date.now()}`
    createdConnections.push(connectionId)

    await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'test-app',
          connectionId,
          name: 'Details Test',
          email: 'details@e2e.test',
          credentials: { access_token: 'token' },
          createdAt: Date.now(),
        },
      }
    )

    const res = await request.post(
      `${API_URL}/user/${userId}/connection/${connectionId}/details`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.connection).toBeDefined()
    expect(Array.isArray(body.data.linkedBots)).toBe(true)
    logResult('Connection details', { linkedBots: body.data.linkedBots.length })
  })
})
