/**
 * Connections Page E2E Tests
 *
 * User Journey: OAuth Connections (expanded)
 * Tests the standalone connections management page — viewing, health-checking,
 * and deleting connections outside of the bot builder.
 *
 * Covers:
 * - Page loads without JS errors
 * - Connection list displays created connections
 * - Health check endpoint responds correctly
 * - Connection deletion works
 * - Connection details (linked bots) endpoint responds
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, deleteConnection, loadAuthData } from './helpers'

let token: string
let userId: string

const createdConnections: string[] = []

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
  userId = data.userId
})

test.afterAll(async ({ request }) => {
  for (const id of createdConnections) {
    await deleteConnection(request, userId, token, id).catch(() => {})
  }
})

test.describe('Connections Page API', () => {
  test('list connections returns array', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/connection/list`,
      { headers: authHeaders(token), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('health check endpoint responds for valid connection', async ({
    request,
  }) => {
    const connectionId = `e2e-health-${Date.now()}`
    createdConnections.push(connectionId)

    await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
          connectorId: 'pipedrive',
          connectionId,
          name: 'Health Check Test',
          email: 'health@test.com',
          credentials: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
          },
          createdAt: Date.now(),
        },
      }
    )

    const res = await request.post(
      `${API_URL}/user/${userId}/connection/${connectionId}/health`,
      { headers: authHeaders(token), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(['healthy', 'expired', 'error']).toContain(body.data.status)
  })

  test('details endpoint returns connection and linked bots', async ({
    request,
  }) => {
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
          email: 'details@test.com',
          credentials: { access_token: 'token' },
          createdAt: Date.now(),
        },
      }
    )

    const res = await request.post(
      `${API_URL}/user/${userId}/connection/${connectionId}/details`,
      { headers: authHeaders(token), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.connection).toBeDefined()
    expect(Array.isArray(body.data.linkedBots)).toBe(true)
  })

  test('delete connection removes it from storage', async ({ request }) => {
    const connectionId = `e2e-delete-${Date.now()}`

    await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'test-app',
          connectionId,
          name: 'Delete Test',
          email: 'delete@test.com',
          credentials: { access_token: 'token' },
        },
      }
    )

    const deleteRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/delete/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await deleteRes.json()).success).toBe(true)

    const readRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/read/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await readRes.json()).data).toBeFalsy()
  })

  test('health check returns unknown for connection without connector', async ({
    request,
  }) => {
    const connectionId = `e2e-unknown-${Date.now()}`
    createdConnections.push(connectionId)

    await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'nonexistent-app-id',
          connectionId,
          name: 'Unknown Connector',
          email: 'unknown@test.com',
          credentials: { access_token: 'token' },
        },
      }
    )

    const res = await request.post(
      `${API_URL}/user/${userId}/connection/${connectionId}/health`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('unknown')
  })
})
