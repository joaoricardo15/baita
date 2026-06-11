/**
 * Google Connector E2E Tests
 *
 * Tests Google services via standalone task execution:
 * - list-messages: List Gmail emails (gmail.readonly scope)
 * - get-message: Get specific email by ID (path parameter interpolation)
 * - send-message: Send email (gmail.send scope, RFC 2822 body format)
 *
 * Requires: Google OAuth2 connection (copied from admin in setup).
 * Fails hard if connection is broken — never skips silently.
 */
import { expect, test } from '@playwright/test'

import { GOOGLE_APP_ID, loadAuthData, logResult } from '../helpers'
import { buildGoogleTask, executeTask, findConnection } from './_helpers'

let token: string
let googleConnectionId: string

test.beforeAll(async ({ request }) => {
  const data = loadAuthData()
  token = data.accessToken
  const conn = await findConnection(request, token, GOOGLE_APP_ID)
  expect(
    conn,
    'Google connection not found — setup must copy admin connections before connector tests run'
  ).toBeTruthy()
  googleConnectionId = conn!.connectionId
})

test.describe('Google Connector — Gmail', () => {
  let firstMessageId: string

  test('list-messages: lists Gmail messages', async ({ request }) => {
    const task = buildGoogleTask(googleConnectionId, {
      label: 'List emails',
      path: 'gmail/v1/users/me/messages',
      method: 'get',
      outputPath: 'messages',
      extraInputFields: [
        { name: 'queryParams.maxResults', label: 'Max results', type: 'text' },
      ],
      extraInputData: [
        {
          name: 'queryParams.maxResults',
          label: 'Max results',
          type: 'text',
          value: '3',
        },
      ],
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)
    expect(
      body.data.status,
      `Gmail API failed: ${String(body.data.outputData)}. ` +
        'Admin must reconnect Google at https://baita.help → Connections.'
    ).toBe('success')
    expect(Array.isArray(body.data.outputData)).toBe(true)

    const messages = body.data.outputData as { id: string; threadId: string }[]
    expect(messages.length).toBeGreaterThan(0)
    expect(messages[0]).toHaveProperty('id')
    expect(messages[0]).toHaveProperty('threadId')

    firstMessageId = messages[0].id
    logResult('Gmail list-messages', {
      count: messages.length,
      firstId: firstMessageId,
    })
  })

  test('get-message: gets specific email by ID', async ({ request }) => {
    expect(
      firstMessageId,
      'No message ID — list-messages must pass first'
    ).toBeTruthy()

    const task = buildGoogleTask(googleConnectionId, {
      label: 'Get email',
      path: 'gmail/v1/users/me/messages/{messageId}',
      method: 'get',
      outputMapping: {
        id: 'id',
        snippet: 'snippet',
        from: 'payload.headers[name=From].value',
        to: 'payload.headers[name=To].value',
        subject: 'payload.headers[name=Subject].value',
        date: 'payload.headers[name=Date].value',
        body: 'payload|email-body',
      },
      extraInputFields: [
        {
          name: 'queryParams.messageId',
          label: 'Message ID',
          type: 'output',
        },
      ],
      extraInputData: [
        {
          name: 'queryParams.messageId',
          label: 'Message ID',
          type: 'text',
          value: firstMessageId,
        },
      ],
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)
    expect(
      body.data.status,
      `Gmail API failed: ${String(body.data.outputData)}. ` +
        'Admin must reconnect Google at https://baita.help → Connections.'
    ).toBe('success')

    const message = body.data.outputData as Record<string, unknown>
    expect(message).toHaveProperty('id')
    expect(message).toHaveProperty('snippet')
    expect(message).toHaveProperty('from')
    expect(message).toHaveProperty('subject')
    expect(message).toHaveProperty('body')
    expect(typeof message.body).toBe('string')
    expect((message.body as string).length).toBeGreaterThan(5)
    logResult('Gmail get-message', {
      id: message.id,
      from: message.from,
      subject: (message.subject as string)?.slice(0, 40),
      bodyPreview: (message.body as string)?.slice(0, 60),
    })
  })

  test('send-message: sends an email', async ({ request }) => {
    const task = buildGoogleTask(googleConnectionId, {
      label: 'Send email',
      path: 'gmail/v1/users/me/messages/send',
      method: 'post',
      bodyEncoding: 'email-rfc2822',
      outputPath: 'id',
      extraInputFields: [
        { name: 'bodyParams.to', label: 'To', type: 'output', required: true },
        {
          name: 'bodyParams.subject',
          label: 'Subject',
          type: 'output',
          required: true,
        },
        {
          name: 'bodyParams.body',
          label: 'Body',
          type: 'output',
          required: true,
        },
      ],
      extraInputData: [
        {
          name: 'bodyParams.to',
          label: 'To',
          type: 'text',
          value: 'joaoricardo15@hotmail.com',
        },
        {
          name: 'bodyParams.subject',
          label: 'Subject',
          type: 'text',
          value: `E2E test ${Date.now()}`,
        },
        {
          name: 'bodyParams.body',
          label: 'Body',
          type: 'text',
          value: 'Automated E2E test email — safe to ignore.',
        },
      ],
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)
    expect(
      body.data.status,
      `Gmail send failed: ${String(body.data.outputData)}. ` +
        'Admin must reconnect Google at https://baita.help → Connections.'
    ).toBe('success')
    expect(body.data.outputData).toBeTruthy()
    logResult('Gmail send-message', { messageId: body.data.outputData })
  })
})
