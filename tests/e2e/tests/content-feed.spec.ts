/**
 * Content Feed E2E Tests
 *
 * User Journey: Content Feed
 * Tests the full content lifecycle using DynamoDB:
 * 1. Create a bot with a publishToFeed task
 * 2. Execute the task (writes content records to DynamoDB)
 * 3. Read content from feed (GET /content returns fresh items)
 * 4. Verify content structure matches what was published
 * 5. React to content (PATCH marks as seen)
 * 6. Verify reacted content no longer appears in feed
 *
 * Part of the 'journeys' project — depends on user-lifecycle.spec.ts setup.
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData, logResult } from './helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
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
        .delete(`${API_URL}/bots/${botId}`, {
          headers: authHeaders(token),
        })
        .catch(() => {})
    }
  })

  test('create bot for content publishing', async ({ request }) => {
    const res = await request.post(`${API_URL}/bots`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    botId = body.data.botId
    logResult('Content bot created', { botId })
  })

  test('configure bot with publishToFeed task', async ({ request }) => {
    const res = await request.patch(`${API_URL}/bots/${botId}`, {
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
    })
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

    const res = await request.post(`${API_URL}/bots/${botId}/test`, {
      headers: authHeaders(token),
      data: { task, taskIndex: 1 },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('publishToFeed executed', {
      status: body.data?.status,
      outputData: body.data?.outputData,
    })
    expect(body.data?.status).toBe('success')
  })

  test('read content from feed and verify structure', async ({ request }) => {
    const res = await request.get(`${API_URL}/content`, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data?.length).toBeGreaterThan(0)

    const found = body.data.find(
      (item: { contentId: string }) =>
        item.contentId === testContent[0].contentId
    )
    expect(found).toBeTruthy()
    expect(found.header).toBe('E2E Test Article 1')
    expect(found.author.name).toBe('E2E Bot')
    expect(found.publishedAt).toBeDefined()
    expect(found.seenAt).toBeUndefined()

    logResult('Content verified', {
      totalItems: body.data.length,
      matchedTestContent: true,
    })
  })

  test('content persists on second read (no longer deleted on delivery)', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/content`, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const stillPresent = body.data?.find(
      (item: { contentId: string }) =>
        item.contentId === testContent[0].contentId
    )
    expect(stillPresent).toBeTruthy()
    logResult('Content persists on second read', {
      itemsStillPresent: body.data?.length,
    })
  })

  test('react to content marks it as seen', async ({ request }) => {
    const res = await request.patch(
      `${API_URL}/content/${testContent[0].contentId}`,
      {
        headers: authHeaders(token),
        data: { reaction: 'like' },
      }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Reacted to content', { reaction: 'like' })
  })

  test('reacted content no longer appears in feed', async ({ request }) => {
    const res = await request.get(`${API_URL}/content`, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const reactedItem = body.data?.find(
      (item: { contentId: string }) =>
        item.contentId === testContent[0].contentId
    )
    expect(reactedItem).toBeFalsy()

    const unreactedItem = body.data?.find(
      (item: { contentId: string }) =>
        item.contentId === testContent[1].contentId
    )
    expect(unreactedItem).toBeTruthy()

    logResult('Reacted content filtered from feed', {
      reactedItemGone: true,
      unreactedItemPresent: true,
    })
  })

  test('deduplication: re-publishing same content does not create duplicates', async ({
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
          sampleValue: testContent,
        },
      ],
    }

    const res = await request.post(`${API_URL}/bots/${botId}/test`, {
      headers: authHeaders(token),
      data: { task, taskIndex: 1 },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data?.status).toBe('fail')
    expect(body.data?.message).toContain('already seen')
    logResult('Dedup verified: re-publish produced 0 new items')
  })

  test('cleanup: delete content bot', async ({ request }) => {
    if (botId) {
      const res = await request.delete(`${API_URL}/bots/${botId}`, {
        headers: authHeaders(token),
      })
      expect(res.status()).toBe(200)
      botId = ''
      logResult('Content bot deleted', { cleaned: true })
    }
  })
})
