/**
 * Content Feed E2E Tests
 *
 * User Journey: Content Feed
 * Tests the full content lifecycle using real AWS resources:
 * 1. Create a bot with a publishToFeed task
 * 2. Execute the task (writes to user's SQS queue)
 * 3. Read content from feed (GET /content consumes from SQS)
 * 4. Verify content structure matches what was published
 * 5. Verify consumption (second read returns empty — SQS deletes on delivery)
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
    if (botId) {
      await request
        .post(`${API_URL}/user/${userId}/bot/delete/${botId}`, {
          headers: authHeaders(token),
          data: {},
        })
        .catch(() => {})
    }
  })

  test('create bot for content publishing', async ({ request }) => {
    const res = await request.post(`${API_URL}/user/${userId}/bot/create`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    botId = body.data.botId
    logResult('Content bot created', { botId })
  })

  test('configure bot with publishToFeed task', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/bot/update/${botId}`,
      {
        headers: authHeaders(token),
        data: {
          botId,
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
                  sampleValue: testContent,
                },
              ],
            },
          ],
        },
      }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Bot configured with publishToFeed', { tasks: 2 })
  })

  test('execute publishToFeed task', async ({ request }) => {
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
          sampleValue: testContent,
        },
      ],
    }

    const res = await request.post(
      `${API_URL}/user/${userId}/bot/test/${botId}`,
      { headers: authHeaders(token), data: { task, taskIndex: 1 } }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('publishToFeed executed', {
      status: body.data?.status,
      outputData: body.data?.outputData,
      inputData: body.data?.inputData,
    })
    expect(body.data?.status).toBe('success')
  })

  test('read content from feed and verify structure', async ({ request }) => {
    // SQS messages are available almost immediately after sendMessageBatch,
    // but allow a short window for propagation
    let content: {
      contentId: string
      header: string
      author: { name: string }
    }[] = []

    for (let attempt = 1; attempt <= 5; attempt++) {
      await new Promise((r) => setTimeout(r, 2000))

      const res = await request.get(`${API_URL}/user/${userId}/content`, {
        headers: authHeaders(token),
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)

      if (body.data?.length > 0) {
        content = body.data
        logResult('Content available', { attempt, items: content.length })
        break
      }
      logResult('Feed empty, retrying', { attempt })
    }

    expect(content.length).toBeGreaterThan(0)

    const found = content.find(
      (item) => item.contentId === testContent[0].contentId
    )
    expect(found).toBeTruthy()
    expect(found!.header).toBe('E2E Test Article 1')
    expect(found!.author.name).toBe('E2E Bot')

    logResult('Content verified', {
      totalItems: content.length,
      matchedTestContent: true,
    })
  })

  test('content is consumed after read (SQS deletes on delivery)', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const stillPresent = body.data?.find(
      (item: { contentId: string }) =>
        item.contentId === testContent[0].contentId
    )
    expect(stillPresent).toBeFalsy()
    logResult('Content consumed (not present on second read)', {
      remainingItems: body.data?.length ?? 0,
    })
  })

  test('cleanup: delete content bot', async ({ request }) => {
    if (botId) {
      const res = await request.post(
        `${API_URL}/user/${userId}/bot/delete/${botId}`,
        { headers: authHeaders(token), data: {} }
      )
      expect(res.status()).toBe(200)
      botId = ''
      logResult('Content bot deleted', { cleaned: true })
    }
  })
})
