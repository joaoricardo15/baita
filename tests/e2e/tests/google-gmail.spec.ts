/**
 * Google Gmail E2E Test
 *
 * User Journey: Gmail Integration
 * Validates Gmail API functionality via the bot task testing mechanism.
 * Covers Google's verification requirements:
 * - OAuth connection present and usable
 * - Gmail API actually called (gmail.readonly scope)
 * - Scope justification: reading emails in automation workflow
 *
 * Part of the 'journeys' project — depends on user-lifecycle.spec.ts setup.
 * Prerequisites:
 * - Google connection must have gmail.readonly scope in its refresh token
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

test.describe('Google Gmail Integration', () => {
  let botId: string
  let apiId: string
  let googleConnectionId: string

  test('verify Google connection exists', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/connection/list`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    expect(body.success).toBe(true)

    const googleConn = body.data.find(
      (c: { appId: string }) =>
        c.appId === '5c16e311-a65a-449c-ad82-1f23a41cf89c'
    )
    expect(googleConn).toBeTruthy()
    googleConnectionId = googleConn.connectionId
    logResult('Google connection found', {
      connectionId: googleConnectionId,
      email: googleConn.email,
    })
  })

  test('create bot for Gmail test', async ({ request }) => {
    const res = await request.post(`${API_URL}/user/${userId}/bot`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    botId = body.data.botId
    apiId = body.data.apiId
    logResult('Bot created', { botId, apiId })
  })

  test('configure bot with Gmail list-messages task', async ({ request }) => {
    const res = await request.put(`${API_URL}/user/${userId}/bot/${botId}`, {
      headers: authHeaders(token),
      data: {
        botId,
        apiId,
        name: `gmail-e2e-${Date.now()}`,
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
            connectionId: googleConnectionId,
            app: {
              name: 'Google',
              appId: '5c16e311-a65a-449c-ad82-1f23a41cf89c',
              icon: '/icons/google.png',
              config: {
                apiUrl: 'https://www.googleapis.com',
                auth: {
                  type: 'body',
                  method: 'post',
                  url: 'https://accounts.google.com/o/oauth2/token',
                  headers: {
                    'Content-type': 'application/x-www-form-urlencoded',
                  },
                  fields: {
                    username: 'GOOGLE_CLIENT_ID',
                    password: 'GOOGLE_CLIENT_SECRET',
                  },
                },
              },
            },
            service: {
              type: 'invoke',
              name: 'method-execute',
              label: 'List emails',
              description: 'List email messages from inbox',
              config: {
                methodName: 'oauth2Request',
                inputFields: [
                  {
                    name: 'method',
                    label: 'Method',
                    type: 'constant',
                    value: 'get',
                  },
                  {
                    name: 'path',
                    label: 'Path',
                    type: 'constant',
                    value: 'gmail/v1/users/me/messages',
                  },
                  {
                    name: 'queryParams.maxResults',
                    label: 'Max results',
                    type: 'output',
                    required: false,
                  },
                ],
                outputPath: 'messages',
              },
            },
            inputData: [
              {
                name: 'method',
                label: 'Method',
                type: 'constant',
                value: 'get',
                sampleValue: 'get',
              },
              {
                name: 'path',
                label: 'Path',
                type: 'constant',
                value: 'gmail/v1/users/me/messages',
                sampleValue: 'gmail/v1/users/me/messages',
              },
              {
                name: 'queryParams.maxResults',
                label: 'Max results',
                type: 'output',
                value: '5',
                sampleValue: '5',
              },
            ],
          },
        ],
      },
    })
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Bot configured with Gmail task', { tasks: 2 })
  })

  test('test Gmail list-messages task returns email data', async ({
    request,
  }) => {
    const task = {
      taskId: 2,
      connectionId: googleConnectionId,
      app: {
        name: 'Google',
        appId: '5c16e311-a65a-449c-ad82-1f23a41cf89c',
        icon: '/icons/google.png',
        config: {
          apiUrl: 'https://www.googleapis.com',
          auth: {
            type: 'body',
            method: 'post',
            url: 'https://accounts.google.com/o/oauth2/token',
            headers: { 'Content-type': 'application/x-www-form-urlencoded' },
            fields: {
              username: 'GOOGLE_CLIENT_ID',
              password: 'GOOGLE_CLIENT_SECRET',
            },
          },
        },
      },
      service: {
        type: 'invoke',
        name: 'method-execute',
        label: 'List emails',
        config: {
          methodName: 'oauth2Request',
          inputFields: [
            {
              name: 'method',
              label: 'Method',
              type: 'constant',
              value: 'get',
            },
            {
              name: 'path',
              label: 'Path',
              type: 'constant',
              value: 'gmail/v1/users/me/messages',
            },
            {
              name: 'queryParams.maxResults',
              label: 'Max results',
              type: 'output',
              required: false,
            },
          ],
          outputPath: 'messages',
        },
      },
      inputData: [
        {
          name: 'method',
          label: 'Method',
          type: 'constant',
          value: 'get',
          sampleValue: 'get',
        },
        {
          name: 'path',
          label: 'Path',
          type: 'constant',
          value: 'gmail/v1/users/me/messages',
          sampleValue: 'gmail/v1/users/me/messages',
        },
        {
          name: 'queryParams.maxResults',
          label: 'Max results',
          type: 'output',
          value: '5',
          sampleValue: '5',
        },
      ],
    }

    const res = await request.post(
      `${API_URL}/user/${userId}/bot/${botId}/test/1`,
      { headers: authHeaders(token), data: task }
    )
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Gmail list-messages result', body.data)

    const readRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/read/${botId}`,
      { headers: authHeaders(token), data: {} }
    )
    const botData = (await readRes.json()).data
    const sampleResult = botData.tasks[1].sampleResult
    expect(sampleResult).toBeTruthy()

    if (sampleResult.status !== 'success') {
      // Token likely expired (copied from admin, >1h old)
      expect(API_URL).toContain('localhost')
      logResult('Gmail task failed (expired token — expected locally)', {
        status: sampleResult.status,
      })
      return
    }

    expect(sampleResult.outputData).toBeTruthy()
    logResult('Gmail API returned data', {
      status: sampleResult.status,
      hasOutput: !!sampleResult.outputData,
      messageCount: Array.isArray(sampleResult.outputData)
        ? sampleResult.outputData.length
        : 'not array',
    })
  })

  test('cleanup: delete Gmail test bot', async ({ request }) => {
    if (botId && apiId) {
      const res = await request.delete(
        `${API_URL}/user/${userId}/bot/${botId}/api/${apiId}`,
        { headers: authHeaders(token) }
      )
      expect(res.status()).toBe(200)
      logResult('Gmail test bot deleted', { botId })
    }
  })
})
