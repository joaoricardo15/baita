/**
 * OAuth Connector E2E Tests
 *
 * User Journey: OAuth Connections
 * Tests the partner connection system — users authorizing Baita to access
 * their 3rd-party accounts (Google, Pipedrive, etc.).
 * This is SEPARATE from user authentication (Baita login via Auth0).
 *
 * Covers:
 * - Connection CRUD: create, read, update, delete in DynamoDB
 * - Token refresh persistence: updated credentials survive between executions
 * - OAuth callback endpoint: handles errors, missing params, invalid state gracefully
 * - Connection lifecycle: full create → use → update → delete flow
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

test.describe('Connection Storage', () => {
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

  test('create and read connection with credentials', async ({ request }) => {
    const connectionId = `smoke-conn-${Date.now()}`
    const connection = {
      appId: 'test-app',
      connectionId,
      name: 'Test Connection',
      email: 'test@example.com',
      credentials: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      },
    }

    const createRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      { headers: authHeaders(token), data: connection }
    )
    expect((await createRes.json()).success).toBe(true)

    const readRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/read/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    const readBody = await readRes.json()
    expect(readBody.data.email).toBe('test@example.com')
    expect(readBody.data.credentials.access_token).toBe('test-access-token')

    await request.post(
      `${API_URL}/user/${userId}/resource/connection/delete/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
  })
})

test.describe('Token Refresh Persistence', () => {
  test('updated credentials persist after token refresh', async ({
    request,
  }) => {
    const connectionId = `smoke-refresh-${Date.now()}`

    await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'test-app',
          connectionId,
          name: 'Refresh Test',
          email: 'refresh@test.com',
          credentials: { access_token: 'original-token' },
        },
      }
    )

    const updateRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/update/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'test-app',
          connectionId,
          name: 'Refresh Test',
          email: 'refresh@test.com',
          credentials: { access_token: 'refreshed-token' },
        },
      }
    )
    expect((await updateRes.json()).success).toBe(true)

    const readRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/read/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await readRes.json()).data.credentials.access_token).toBe(
      'refreshed-token'
    )

    await request.post(
      `${API_URL}/user/${userId}/resource/connection/delete/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
  })
})

test.describe('OAuth Callback Endpoint', () => {
  test('responds gracefully without params (no 500)', async ({ request }) => {
    const res = await request.get(`${API_URL}/connectors/oauth`)
    expect(res.status()).toBe(200)
  })

  test('responds gracefully with error param', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/connectors/oauth?error=access_denied&state=test`
    )
    expect(res.status()).toBe(200)
  })

  test('responds gracefully with invalid state', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/connectors/oauth?code=fake&state=invalid`
    )
    expect(res.status()).toBe(200)
  })
})

test.describe('Connection Lifecycle', () => {
  test('create → read → update → delete', async ({ request }) => {
    const connectionId = `smoke-lifecycle-${Date.now()}`

    const createRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/create/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'lifecycle-test',
          connectionId,
          name: 'Lifecycle Test',
          email: 'lifecycle@test.com',
          credentials: { access_token: 'token-v1' },
        },
      }
    )
    expect((await createRes.json()).success).toBe(true)

    const readRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/read/${connectionId}`,
      { headers: authHeaders(token), data: {} }
    )
    expect((await readRes.json()).data.name).toBe('Lifecycle Test')

    const updateRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/update/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          appId: 'lifecycle-test',
          connectionId,
          name: 'Lifecycle Test',
          email: 'lifecycle@test.com',
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
  })
})
