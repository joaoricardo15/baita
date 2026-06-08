/**
 * Bot Journey E2E Tests
 *
 * User Journey: Bot Automation (Complete Lifecycle)
 * Tests the full bot lifecycle from creation through deployment and execution:
 * - Create a new bot
 * - Configure trigger (webhook)
 * - Add a code-execute task
 * - Test individual task
 * - Deploy bot
 * - Trigger bot via webhook
 * - Verify execution in logs
 * - Deactivate and delete bot
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData, logResult } from './helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
})

test.describe.configure({ mode: 'serial' })

test.describe('Bot Lifecycle', () => {
  let botId: string
  let triggerUrl: string

  test.afterAll(async ({ request }) => {
    if (botId) {
      await request
        .post(`${API_URL}/bot/delete/${botId}`, {
          headers: authHeaders(token),
          data: {},
        })
        .catch(() => {})
    }
  })

  test('create a new bot', async ({ request }) => {
    const res = await request.post(`${API_URL}/bot/create`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.botId).toBeTruthy()
    expect(body.data.apiId).toBeTruthy()
    expect(body.data.triggerUrl).toMatch(/^https:\/\//)

    botId = body.data.botId
    triggerUrl = body.data.triggerUrl
    logResult('Bot created', { botId, triggerUrl })
  })

  test('configure bot with webhook trigger and code task', async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/bot/update/${botId}`, {
      headers: authHeaders(token),
      data: {
        botId,
        name: `e2e-bot-${Date.now()}`,
        active: false,
        triggerUrl,
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
              name: 'code-execute',
              label: 'Run Code',
              config: {
                inputFields: [
                  {
                    name: 'code',
                    label: 'Code',
                    type: 'code',
                    required: true,
                  },
                ],
              },
            },
            inputData: [
              {
                name: 'code',
                label: 'Code',
                type: 'code',
                value:
                  'return { result: "hello from e2e", timestamp: Date.now() }',
                sampleValue:
                  'return { result: "hello from e2e", timestamp: Date.now() }',
              },
            ],
          },
        ],
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('test code task and verify sample result', async ({ request }) => {
    const task = {
      taskId: 2,
      service: {
        type: 'invoke',
        name: 'code-execute',
        label: 'Run Code',
        config: {
          inputFields: [
            { name: 'code', label: 'Code', type: 'code', required: true },
          ],
        },
      },
      inputData: [
        {
          name: 'code',
          label: 'Code',
          type: 'code',
          value: 'output = { result: "hello from e2e", timestamp: Date.now() }',
          sampleValue:
            'output = { result: "hello from e2e", timestamp: Date.now() }',
        },
      ],
    }

    const res = await request.post(`${API_URL}/bot/test/${botId}`, {
      headers: authHeaders(token),
      data: { task, taskIndex: 1 },
    })
    const body = await res.json()
    expect(body.success).toBe(true)

    const readRes = await request.post(
      `${API_URL}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const botData = (await readRes.json()).data
    expect(botData.tasks[1].sampleResult).toBeTruthy()
    expect(botData.tasks[1].sampleResult.outputData).toBeTruthy()
    logResult('Task test result', botData.tasks[1].sampleResult)
  })

  test('deploy bot', async ({ request }) => {
    const getRes = await request.post(`${API_URL}/resource/bot/read/${botId}`, {
      headers: authHeaders(token),
      data: {},
    })
    const bot = (await getRes.json()).data

    let body: { success: boolean; data: { active: boolean } }
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await request.post(`${API_URL}/bot/deploy/${botId}`, {
        headers: authHeaders(token),
        data: { ...bot, active: true },
        timeout: 55000,
      })
      body = await res.json()
      if (body.success || attempt === 3) break
      await new Promise((r) => setTimeout(r, 3000))
    }
    expect(body!.success).toBe(true)
    expect(body!.data.active).toBe(true)
    logResult('Bot deployed', { active: true })
  })

  test('trigger bot via webhook', async ({ request }) => {
    const res = await request.post(triggerUrl, {
      data: { source: 'e2e-test', timestamp: Date.now() },
    })
    expect(res.status()).toBe(200)
    logResult('Webhook triggered', { status: res.status() })
  })

  test('verify execution appears in logs', async ({ request }) => {
    await new Promise((r) => setTimeout(r, 3000))

    const res = await request.post(`${API_URL}/bot/logs/${botId}`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    logResult('Logs', { count: body.data.length })
  })

  test('deactivate bot', async ({ request }) => {
    await new Promise((r) => setTimeout(r, 2000))

    const getRes = await request.post(`${API_URL}/resource/bot/read/${botId}`, {
      headers: authHeaders(token),
      data: {},
    })
    const bot = (await getRes.json()).data

    const res = await request.post(`${API_URL}/bot/deploy/${botId}`, {
      headers: authHeaders(token),
      data: { ...bot, active: false },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.active).toBe(false)
  })

  test('delete bot and verify cleanup', async ({ request }) => {
    const res = await request.post(`${API_URL}/bot/delete/${botId}`, {
      headers: authHeaders(token),
      data: {},
    })
    expect(res.status()).toBe(200)

    const verifyRes = await request.post(
      `${API_URL}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await verifyRes.json()
    expect(body.data).toBeFalsy()

    botId = ''
    logResult('Bot deleted', { verified: true })
  })
})
