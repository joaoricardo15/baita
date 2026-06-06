/**
 * Content Feed E2E Tests
 *
 * User Journey: Content Feed
 * Tests the full content lifecycle:
 * - Publish content to feed (via bot task execution)
 * - Read content from feed (GET /content)
 * - Verify content structure matches what was published
 * - Content is consumed on read (SQS deletes after delivery)
 *
 * Part of the 'journeys' project — depends on user-lifecycle.spec.ts setup.
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

test.describe('Content Feed', () => {
  let botId: string
  let apiId: string

  const testContent = [
    {
      contentId: `e2e-content-${Date.now()}-1`,
      date: new Date().toISOString(),
      header: 'E2E Test Article 1',
      body: 'First test article body',
      source: 'E2E Test Suite',
      author: { name: 'E2E Bot' },
    },
    {
      contentId: `e2e-content-${Date.now()}-2`,
      date: new Date().toISOString(),
      header: 'E2E Test Article 2',
      body: 'Second test article body',
      source: 'E2E Test Suite',
      url: 'https://example.com/article',
      author: { name: 'E2E Bot', accountName: '@e2e' },
    },
  ]

  test.afterAll(async ({ request }) => {
    if (botId && apiId) {
      await request
        .delete(`${API_URL}/user/${userId}/bot/${botId}/api/${apiId}`, {
          headers: authHeaders(token),
        })
        .catch(() => {})
    }
  })

  test('create bot for content publishing', async ({ request }) => {
    const res = await request.post(`${API_URL}/user/${userId}/bot`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    botId = body.data.botId
    apiId = body.data.apiId
    logResult('Content bot created', { botId, apiId })
  })

  test('configure bot with publishToFeed task', async ({ request }) => {
    const res = await request.put(`${API_URL}/user/${userId}/bot/${botId}`, {
      headers: authHeaders(token),
      data: {
        botId,
        apiId,
        name: `content-feed-e2e-${Date.now()}`,
        active: false,
        tasks: [
          {
            taskId: 1,
            service: {
              type: 'trigger',
              name: 'webhook',
              label: 'Receive Webhook',
              config: { inputFields: [] },
            },
            inputData: [],
          },
          {
            taskId: 2,
            service: {
              type: 'invoke',
              name: 'method-execute',
              label: 'Publish content to feed',
              config: {
                methodName: 'publishToFeed',
                inputFields: [
                  {
                    name: 'content',
                    label: 'content',
                    type: 'output',
                    required: true,
                  },
                ],
              },
            },
            inputData: [
              {
                name: 'content',
                label: 'content',
                type: 'output',
                value: JSON.stringify(testContent),
                sampleValue: JSON.stringify(testContent),
              },
            ],
          },
        ],
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Bot configured with publishToFeed', { tasks: 2 })
  })

  test('test publishToFeed task pushes content to feed', async ({
    request,
  }) => {
    const task = {
      taskId: 2,
      service: {
        type: 'invoke',
        name: 'method-execute',
        label: 'Publish content to feed',
        config: {
          methodName: 'publishToFeed',
          inputFields: [
            {
              name: 'content',
              label: 'content',
              type: 'output',
              required: true,
            },
          ],
        },
      },
      inputData: [
        {
          name: 'content',
          label: 'content',
          type: 'output',
          value: JSON.stringify(testContent),
          sampleValue: JSON.stringify(testContent),
        },
      ],
    }

    const res = await request.post(
      `${API_URL}/user/${userId}/bot/${botId}/test/1`,
      { headers: authHeaders(token), data: task }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('publishToFeed result', body.data)
  })

  test('read content from feed and verify structure', async ({ request }) => {
    await new Promise((r) => setTimeout(r, 2000))

    const res = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()

    if (!body.success || !body.data?.length) {
      // SQS not available locally (serverless-offline limitation)
      expect(API_URL).toContain('localhost')
      logResult('Content feed skipped (no SQS locally)', {})
      return
    }

    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    const found = body.data.find(
      (item: { contentId: string }) =>
        item.contentId === testContent[0].contentId
    )
    expect(found).toBeTruthy()
    expect(found.header).toBe('E2E Test Article 1')
    expect(found.author.name).toBe('E2E Bot')

    logResult('Content feed read', {
      totalItems: body.data.length,
      foundTestContent: !!found,
    })
  })

  test('content is consumed after read (SQS deletes on delivery)', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: authHeaders(token),
    })
    const body = await res.json()

    if (!body.success) {
      // SQS not available locally
      expect(API_URL).toContain('localhost')
      logResult('Content consumption skipped (no SQS locally)', {})
      return
    }

    const stillPresent = body.data?.find(
      (item: { contentId: string }) =>
        item.contentId === testContent[0].contentId
    )
    expect(stillPresent).toBeFalsy()
    logResult('Content consumed', { remainingItems: body.data?.length ?? 0 })
  })

  test('cleanup: delete content bot', async ({ request }) => {
    if (botId && apiId) {
      const res = await request.delete(
        `${API_URL}/user/${userId}/bot/${botId}/api/${apiId}`,
        { headers: authHeaders(token) }
      )
      expect(res.status()).toBe(200)
      botId = ''
      apiId = ''
      logResult('Content bot deleted', { cleaned: true })
    }
  })
})
