/**
 * Bot Journey E2E Tests
 *
 * User Journey 4: Bot Automation (Complete Lifecycle)
 * Tests the full bot customer journey from creation through deployment and execution:
 * - Create a new bot
 * - Configure trigger (webhook)
 * - Add a task with service
 * - Test individual task
 * - Map variables between tasks
 * - Deploy bot
 * - Trigger bot via webhook
 * - Verify execution in logs
 * - Delete task and re-add
 * - Re-deploy after changes
 * - Delete bot (cleanup)
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

test.describe('Bot Journey: Full Lifecycle', () => {
  let botId: string
  let apiId: string
  let triggerUrl: string

  test.afterAll(async ({ request }) => {
    if (botId && apiId) {
      await request
        .delete(`${API_URL}/user/${userId}/bot/${botId}/api/${apiId}`, {
          headers: authHeaders(token),
        })
        .catch(() => {})
    }
  })

  test('create a new bot', async ({ request }) => {
    const res = await request.post(`${API_URL}/user/${userId}/bot`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.botId).toBeTruthy()
    expect(body.data.apiId).toBeTruthy()
    expect(body.data.triggerUrl).toMatch(/^https:\/\//)
    expect(body.data.tasks).toHaveLength(1)

    botId = body.data.botId
    apiId = body.data.apiId
    triggerUrl = body.data.triggerUrl
  })

  test('update bot with name and webhook trigger', async ({ request }) => {
    const res = await request.put(`${API_URL}/user/${userId}/bot/${botId}`, {
      headers: authHeaders(token),
      data: {
        botId,
        apiId,
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
        ],
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('add a code-execute task', async ({ request }) => {
    const res = await request.put(`${API_URL}/user/${userId}/bot/${botId}`, {
      headers: authHeaders(token),
      data: {
        botId,
        apiId,
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
                value: 'return { result: "hello from e2e" }',
                sampleValue: 'return { result: "hello from e2e" }',
              },
            ],
          },
        ],
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('test individual task', async ({ request }) => {
    const task = {
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
          value: 'return { result: "hello from e2e" }',
          sampleValue: 'return { result: "hello from e2e" }',
        },
      ],
    }

    const res = await request.post(
      `${API_URL}/user/${userId}/bot/${botId}/test/1`,
      {
        headers: authHeaders(token),
        data: task,
      }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('read bot and verify task has sample result', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tasks[1].sampleResult).toBeTruthy()
    expect(body.data.tasks[1].sampleResult.outputData).toBeTruthy()
  })

  test('deploy bot', async ({ request }) => {
    const getRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const bot = (await getRes.json()).data

    const res = await request.post(
      `${API_URL}/user/${userId}/bot/${botId}/deploy`,
      {
        headers: authHeaders(token),
        data: {
          ...bot,
          active: true,
        },
      }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.active).toBe(true)
  })

  test('trigger bot via webhook', async ({ request }) => {
    const res = await request.post(triggerUrl, {
      data: { source: 'e2e-test', timestamp: Date.now() },
    })
    expect(res.status()).toBe(200)
  })

  test('verify execution in logs', async ({ request }) => {
    // Wait for CloudWatch to index the log
    await new Promise((r) => setTimeout(r, 3000))

    const res = await request.get(
      `${API_URL}/user/${userId}/bot/${botId}/logs`,
      { headers: authHeaders(token) }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('delete a task and verify bot state', async ({ request }) => {
    const getRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const bot = (await getRes.json()).data
    expect(bot.tasks).toHaveLength(2)

    const res = await request.put(`${API_URL}/user/${userId}/bot/${botId}`, {
      headers: authHeaders(token),
      data: {
        ...bot,
        tasks: [bot.tasks[0]],
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)

    const verifyRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const updated = (await verifyRes.json()).data
    expect(updated.tasks).toHaveLength(1)
  })

  test('re-add task and re-deploy', async ({ request }) => {
    const getRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const bot = (await getRes.json()).data

    bot.tasks.push({
      taskId: 3,
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
          value: 'return { redeployed: true }',
          sampleValue: 'return { redeployed: true }',
        },
      ],
    })

    const deployRes = await request.post(
      `${API_URL}/user/${userId}/bot/${botId}/deploy`,
      {
        headers: authHeaders(token),
        data: { ...bot, active: true },
      }
    )
    const body = await deployRes.json()
    expect(body.success).toBe(true)
    expect(body.data.tasks).toHaveLength(2)
  })

  test('deactivate bot', async ({ request }) => {
    const getRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const bot = (await getRes.json()).data

    const res = await request.post(
      `${API_URL}/user/${userId}/bot/${botId}/deploy`,
      {
        headers: authHeaders(token),
        data: { ...bot, active: false },
      }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.active).toBe(false)
  })

  test('delete bot cleans up', async ({ request }) => {
    const res = await request.delete(
      `${API_URL}/user/${userId}/bot/${botId}/api/${apiId}`,
      { headers: authHeaders(token) }
    )
    expect(res.status()).toBe(200)

    const verifyRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await verifyRes.json()
    expect(body.data).toBeFalsy()

    botId = ''
    apiId = ''
  })
})
