import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const API_URL = process.env.API_URL || 'https://api.baita.help'
const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

let token: string
let userId: string

test.beforeAll(() => {
  if (fs.existsSync(tokenFile)) {
    const data = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'))
    token = data.accessToken
    userId = data.userId
  }
  if (!token) throw new Error('No access token found. Run auth.setup.ts first.')
})

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

test.describe('Content Feed (Home Page)', () => {
  test('GET /content — returns valid response', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: headers(),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success')
  })
})

test.describe('Todo Page', () => {
  test('POST /resource/todo/list — returns array', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/list`,
      { headers: headers(), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

test.describe('Bots List Page', () => {
  test('POST /resource/bot/list — returns array', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/bot/list`,
      { headers: headers(), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

test.describe('Connections Page', () => {
  test('POST /resource/connection/list — returns array', async ({
    request,
  }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/connection/list`,
      { headers: headers(), data: {} }
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
        headers: headers(),
        data: { title: 'Smoke Test', body: 'Created by E2E', ts: Date.now() },
      }
    )
    expect(res.status()).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  test('read resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/read/${resourceId}`,
      { headers: headers(), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Smoke Test')
  })

  test('update resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/update/${resourceId}`,
      { headers: headers(), data: { title: 'Updated', body: 'Modified' } }
    )
    expect((await res.json()).success).toBe(true)
  })

  test('list includes resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/list`,
      { headers: headers(), data: {} }
    )
    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  test('delete resource', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/delete/${resourceId}`,
      { headers: headers(), data: {} }
    )
    expect((await res.json()).success).toBe(true)
  })

  test('read after delete — empty', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/read/${resourceId}`,
      { headers: headers(), data: {} }
    )
    const body = await res.json()
    expect(body.data).toBeFalsy()
  })
})

test.describe('Bot Lifecycle', () => {
  let botId: string
  let apiId: string

  test('create bot', async ({ request }) => {
    const res = await request.post(`${API_URL}/user/${userId}/bots`, {
      headers: headers(),
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
      `${API_URL}/user/${userId}/bots/${botId}/logs`,
      { headers: headers() }
    )
    expect(res.status()).toBe(200)
  })

  test('read bot from DynamoDB', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: headers(), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.botId).toBe(botId)
  })

  test('delete bot', async ({ request }) => {
    const res = await request.delete(
      `${API_URL}/user/${userId}/bots/${botId}/api/${apiId}`,
      { headers: headers() }
    )
    expect((await res.json()).success).toBe(true)
  })
})

test.describe('Security', () => {
  test('request without token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/${userId}/content`)
    expect(res.status()).toBe(401)
  })

  test('invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: { Authorization: 'Bearer invalid.token' },
    })
    expect(res.status()).toBe(401)
  })

  test('CORS headers on error responses', async ({ request }) => {
    const res = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: {
        Authorization: 'Bearer bad',
        Origin: 'https://www.baita.help',
      },
    })
    expect(res.headers()['access-control-allow-origin']).toBe(
      'https://www.baita.help'
    )
  })
})

test.describe('Error Handling', () => {
  test('invalid operation returns structured error', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/smoke-note/invalid-op`,
      { headers: headers(), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBeTruthy()
  })
})
