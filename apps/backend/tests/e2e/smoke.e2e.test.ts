import { AxiosInstance } from 'axios'

import {
  ensureUserExists,
  getApiClient,
  getUnauthClient,
  getUserId,
} from './setup'

let api: AxiosInstance
let userId: string

beforeAll(async () => {
  api = await getApiClient()
  userId = getUserId()
  await ensureUserExists()
})

// ─── Page: Home / Content Feed ──────────────────────────────────────────────

describe('Content Feed (Home Page)', () => {
  it('GET /user/{userId}/content — authenticated request returns 200', async () => {
    const res = await api.get(`/user/${userId}/content`)
    expect(res.status).toBe(200)
    expect(res.data).toHaveProperty('success')
    expect(typeof res.data.success).toBe('boolean')
  })

  it('GET /user/{userId}/content — data is array or graceful error', async () => {
    const res = await api.get(`/user/${userId}/content`)
    if (res.data.success) {
      expect(Array.isArray(res.data.data)).toBe(true)
    } else {
      expect(typeof res.data.message).toBe('string')
    }
  })
})

// ─── Page: Todo ─────────────────────────────────────────────────────────────

describe('Todo Page', () => {
  it('POST /resource/todo/list — returns array', async () => {
    const res = await api.post(`/user/${userId}/resource/todo/list`, {})
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
    expect(Array.isArray(res.data.data)).toBe(true)
  })
})

// ─── Page: Bots List ────────────────────────────────────────────────────────

describe('Bots List Page', () => {
  it('POST /resource/bot/list — returns array', async () => {
    const res = await api.post(`/user/${userId}/resource/bot/list`, {})
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
    expect(Array.isArray(res.data.data)).toBe(true)
  })
})

// ─── Page: Connections ──────────────────────────────────────────────────────

describe('Connections Page', () => {
  it('POST /resource/connection/list — returns array', async () => {
    const res = await api.post(`/user/${userId}/resource/connection/list`, {})
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
    expect(Array.isArray(res.data.data)).toBe(true)
  })
})

// ─── Feature: Resource CRUD Lifecycle ───────────────────────────────────────

describe('Resource CRUD Lifecycle', () => {
  const resourceId = `smoke-${Date.now()}`

  it('create — stores a new resource', async () => {
    const res = await api.post(
      `/user/${userId}/resource/smoke-note/create/${resourceId}`,
      { title: 'Smoke Test', body: 'Created by CI', timestamp: Date.now() }
    )
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
  })

  it('read — retrieves the created resource', async () => {
    const res = await api.post(
      `/user/${userId}/resource/smoke-note/read/${resourceId}`,
      {}
    )
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
    expect(res.data.data).toHaveProperty('title', 'Smoke Test')
    expect(res.data.data).toHaveProperty('body', 'Created by CI')
  })

  it('update — modifies the resource', async () => {
    const res = await api.post(
      `/user/${userId}/resource/smoke-note/update/${resourceId}`,
      { title: 'Updated', body: 'Modified by CI' }
    )
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
  })

  it('read after update — returns new data', async () => {
    const res = await api.post(
      `/user/${userId}/resource/smoke-note/read/${resourceId}`,
      {}
    )
    expect(res.status).toBe(200)
    expect(res.data.data).toHaveProperty('title', 'Updated')
    expect(res.data.data).toHaveProperty('body', 'Modified by CI')
  })

  it('list — includes the resource', async () => {
    const res = await api.post(`/user/${userId}/resource/smoke-note/list`, {})
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
    expect(res.data.data.length).toBeGreaterThanOrEqual(1)
  })

  it('delete — removes the resource', async () => {
    const res = await api.post(
      `/user/${userId}/resource/smoke-note/delete/${resourceId}`,
      {}
    )
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
  })

  it('read after delete — returns empty', async () => {
    const res = await api.post(
      `/user/${userId}/resource/smoke-note/read/${resourceId}`,
      {}
    )
    expect(res.status).toBe(200)
    expect(res.data.data).toBeFalsy()
  })
})

// ─── Feature: Bot Lifecycle ─────────────────────────────────────────────────

describe('Bot Lifecycle', () => {
  let botId: string
  let apiId: string

  it('POST /bots — creates a new bot (Lambda + S3 + API Gateway)', async () => {
    const res = await api.post(`/user/${userId}/bots`, {})
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
    expect(res.data.data).toHaveProperty('botId')
    expect(res.data.data).toHaveProperty('apiId')
    expect(res.data.data).toHaveProperty('triggerUrl')
    expect(res.data.data.triggerUrl).toMatch(/^https:\/\//)
    expect(res.data.data.active).toBe(false)

    botId = res.data.data.botId
    apiId = res.data.data.apiId
  })

  it('GET /bots/{botId}/logs — retrieves logs (may be empty)', async () => {
    expect(botId).toBeDefined()

    const res = await api.get(`/user/${userId}/bots/${botId}/logs`)
    expect(res.status).toBe(200)
    expect(res.data).toHaveProperty('success')
  })

  it('POST /resource/bot/read/{botId} — reads bot from DynamoDB', async () => {
    expect(botId).toBeDefined()

    const res = await api.post(`/user/${userId}/resource/bot/read/${botId}`, {})
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
    expect(res.data.data).toHaveProperty('botId', botId)
  })

  it('DELETE /bots/{botId}/api/{apiId} — cleans up bot resources', async () => {
    expect(botId).toBeDefined()
    expect(apiId).toBeDefined()

    const res = await api.delete(`/user/${userId}/bots/${botId}/api/${apiId}`)
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
  })

  it('POST /resource/bot/read/{botId} — confirms deletion', async () => {
    expect(botId).toBeDefined()

    const res = await api.post(`/user/${userId}/resource/bot/read/${botId}`, {})
    expect(res.status).toBe(200)
    expect(res.data.data).toBeFalsy()
  })
})

// ─── Security: Unauthorized Access ──────────────────────────────────────────

describe('Security — Unauthorized Access', () => {
  it('request without token returns 401', async () => {
    const unauth = getUnauthClient()
    const res = await unauth.get(`/user/${userId}/content`)
    expect(res.status).toBe(401)
  })

  it('request with invalid token returns 401', async () => {
    const unauth = getUnauthClient()
    const res = await unauth.get(`/user/${userId}/content`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    })
    expect(res.status).toBe(401)
  })

  it('error responses include CORS headers', async () => {
    const unauth = getUnauthClient()
    const res = await unauth.get(`/user/${userId}/content`, {
      headers: {
        Authorization: 'Bearer invalid',
        Origin: 'https://www.baita.help',
      },
    })
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://www.baita.help'
    )
  })
})

// ─── Resilience: Error Handling ─────────────────────────────────────────────

describe('Resilience — Error Handling', () => {
  it('invalid operation returns structured error', async () => {
    const res = await api.post(
      `/user/${userId}/resource/smoke-note/invalid-op`,
      {}
    )
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(false)
    expect(typeof res.data.message).toBe('string')
    expect(res.data.message.length).toBeGreaterThan(0)
  })

  it('missing resourceId for read returns empty result', async () => {
    const res = await api.post(`/user/${userId}/resource/smoke-note/read`, {})
    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
  })
})
