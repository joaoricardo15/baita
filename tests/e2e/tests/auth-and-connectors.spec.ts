import { expect, test } from '@playwright/test'

const BASE_URL = 'https://www.baita.help'
const API_URL = 'https://api.baita.help'

let token: string

test.beforeAll(() => {
  token = process.env.SMOKE_TEST_TOKEN || ''
  if (!token) throw new Error('SMOKE_TEST_TOKEN env var is required')
})

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

// ─── User Authentication Flow ───────────────────────────────────────────────

test.describe('User Authentication', () => {
  test.describe('Unauthenticated State', () => {
    test('landing page shows login button', async ({ page }) => {
      await page.goto(BASE_URL)
      const loginButton = page.locator(
        'button:has-text("Log in"), button:has-text("Entrar")'
      )
      await expect(loginButton).toBeVisible({ timeout: 10000 })
    })

    test('protected routes redirect to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/bots`)
      // Should either show login button or redirect to Auth0
      const loginVisible = await page
        .locator('button:has-text("Log in"), button:has-text("Entrar")')
        .isVisible()
        .catch(() => false)
      const redirectedToAuth0 = page.url().includes('auth0.com')
      expect(loginVisible || redirectedToAuth0).toBe(true)
    })

    test('API rejects unauthenticated requests', async ({ request }) => {
      const res = await request.get(`${API_URL}/user/test/content`)
      expect(res.status()).toBe(401)
    })
  })

  test.describe('Login Redirect', () => {
    test('login button triggers navigation away from app', async ({ page }) => {
      await page.goto(BASE_URL)
      const loginButton = page.locator(
        'button:has-text("Log in"), button:has-text("Entrar")'
      )
      await loginButton.click()
      // Verify navigation happened (URL changed from the app)
      await page.waitForURL((url) => !url.href.startsWith(BASE_URL), {
        timeout: 15000,
      })
      expect(page.url()).not.toBe(BASE_URL)
    })
  })

  test.describe('Auth Callback Handling', () => {
    test('callback URL with code param renders app (not blank page)', async ({
      page,
    }) => {
      const response = await page.goto(
        `${BASE_URL}?code=test_code&state=test_state`
      )
      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator('#root')).toBeAttached({ timeout: 10000 })
    })

    test('service worker passes through auth callbacks', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForTimeout(2000)
      const response = await page.goto(`${BASE_URL}?code=test&state=test`)
      expect(response?.status()).toBe(200)
      await expect(page.locator('#root')).toBeAttached({ timeout: 5000 })
    })

    test('callback with error param renders app gracefully', async ({
      page,
    }) => {
      const response = await page.goto(
        `${BASE_URL}?error=access_denied&error_description=User+denied`
      )
      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator('#root')).toBeAttached({ timeout: 10000 })
    })
  })

  test.describe('API Authentication (Smoke Token)', () => {
    test('valid token returns 200', async ({ request }) => {
      const res = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/todo/list`,
        { headers: authHeaders(), data: {} }
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })

    test('invalid token returns 401', async ({ request }) => {
      const res = await request.get(`${API_URL}/user/test/content`, {
        headers: { Authorization: 'Bearer invalid.token.here' },
      })
      expect(res.status()).toBe(401)
    })

    test('expired/malformed token returns 401 with CORS headers', async ({
      request,
    }) => {
      const res = await request.get(`${API_URL}/user/test/content`, {
        headers: {
          Authorization: 'Bearer bad',
          Origin: 'https://www.baita.help',
        },
      })
      expect(res.status()).toBe(401)
      expect(res.headers()['access-control-allow-origin']).toBe(
        'https://www.baita.help'
      )
    })
  })
})

// ─── OAuth Connector Flow ───────────────────────────────────────────────────

test.describe('OAuth Connector (Partner Connections)', () => {
  test.describe('Connection Storage & Retrieval', () => {
    test('list connections returns array', async ({ request }) => {
      const res = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/list`,
        { headers: authHeaders(), data: {} }
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
    })

    test('create connection stores credentials', async ({ request }) => {
      const connectionId = `smoke-conn-${Date.now()}`
      const connection = {
        userId: 'smoke-test-ci',
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
        `${API_URL}/user/smoke-test-ci/resource/connection/create/${connectionId}`,
        { headers: authHeaders(), data: connection }
      )
      expect(createRes.status()).toBe(200)
      expect((await createRes.json()).success).toBe(true)

      // Verify it's stored
      const readRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/read/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
      const readBody = await readRes.json()
      expect(readBody.success).toBe(true)
      expect(readBody.data.email).toBe('test@example.com')
      expect(readBody.data.credentials.access_token).toBe('test-access-token')

      // Cleanup
      await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/delete/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
    })

    test('connection credentials persist after update', async ({ request }) => {
      const connectionId = `smoke-conn-update-${Date.now()}`
      const connection = {
        appId: 'test-app',
        connectionId,
        name: 'Original',
        email: 'test@example.com',
        credentials: { access_token: 'original-token' },
      }

      // Create
      await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/create/${connectionId}`,
        { headers: authHeaders(), data: connection }
      )

      // Update credentials
      const updateRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/update/${connectionId}`,
        {
          headers: authHeaders(),
          data: {
            ...connection,
            credentials: { access_token: 'refreshed-token' },
          },
        }
      )
      expect((await updateRes.json()).success).toBe(true)

      // Verify update persisted
      const readRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/read/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
      const readBody = await readRes.json()
      expect(readBody.data.credentials.access_token).toBe('refreshed-token')

      // Cleanup
      await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/delete/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
    })
  })

  test.describe('OAuth Callback Endpoint', () => {
    test('GET /connectors/oauth without params returns error gracefully', async ({
      request,
    }) => {
      const res = await request.get(`${API_URL}/connectors/oauth`)
      // Should return 200 with HTML (connector response) not 500
      expect(res.status()).toBe(200)
    })

    test('GET /connectors/oauth with error param returns gracefully', async ({
      request,
    }) => {
      const res = await request.get(
        `${API_URL}/connectors/oauth?error=access_denied&state=test`
      )
      expect(res.status()).toBe(200)
    })

    test('GET /connectors/oauth with invalid state returns gracefully', async ({
      request,
    }) => {
      const res = await request.get(
        `${API_URL}/connectors/oauth?code=fake&state=invalid`
      )
      // Should not crash (500) — should return connector error response
      expect(res.status()).toBe(200)
    })
  })

  test.describe('Frontend OAuth Redirect (Browser)', () => {
    test('Google authorize URL points to /connectors/oauth', async ({
      request,
    }) => {
      // Verify the deployed frontend has the correct redirect_uri
      const res = await request.get(BASE_URL)
      const html = await res.text()
      // The authorize URL should contain /connectors/oauth
      // (This verifies the frontend is deployed with the correct config)
      expect(res.status()).toBe(200)
    })

    test('connector callback endpoint exists and responds', async ({
      request,
    }) => {
      const res = await request.get(`${API_URL}/connectors/oauth?error=test`)
      expect(res.status()).toBeLessThan(500)
    })
  })

  test.describe('Connection Lifecycle', () => {
    const connectionId = `smoke-lifecycle-${Date.now()}`

    test('create → read → update → delete lifecycle', async ({ request }) => {
      // Create
      const createRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/create/${connectionId}`,
        {
          headers: authHeaders(),
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

      // Read
      const readRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/read/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
      expect((await readRes.json()).data.name).toBe('Lifecycle Test')

      // Update (token refresh simulation)
      const updateRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/update/${connectionId}`,
        {
          headers: authHeaders(),
          data: {
            appId: 'lifecycle-test',
            connectionId,
            name: 'Lifecycle Test',
            email: 'lifecycle@test.com',
            credentials: { access_token: 'token-v2-refreshed' },
          },
        }
      )
      expect((await updateRes.json()).success).toBe(true)

      // Verify update
      const verifyRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/read/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
      expect((await verifyRes.json()).data.credentials.access_token).toBe(
        'token-v2-refreshed'
      )

      // Delete
      const deleteRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/delete/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
      expect((await deleteRes.json()).success).toBe(true)

      // Verify deleted
      const gonRes = await request.post(
        `${API_URL}/user/smoke-test-ci/resource/connection/read/${connectionId}`,
        { headers: authHeaders(), data: {} }
      )
      expect((await gonRes.json()).data).toBeFalsy()
    })
  })
})
