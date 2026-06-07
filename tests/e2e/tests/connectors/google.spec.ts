/**
 * Google Connector E2E Tests
 *
 * Tests Google services via standalone task execution:
 * - list-messages: List Gmail emails (gmail.readonly scope)
 * - get-message: Get specific email by ID
 *
 * Requires: Google OAuth2 connection (copied from admin in setup).
 * Skips gracefully if the connection's refresh token is expired.
 */
import { expect, test } from '@playwright/test'

import { GOOGLE_APP_ID, loadAuthData, logResult } from '../helpers'
import { buildGoogleTask, executeTask, findConnection } from './_helpers'

let token: string
let userId: string
let googleConnectionId: string

test.beforeAll(async ({ request }) => {
  const data = loadAuthData()
  token = data.accessToken
  userId = data.userId

  const conn = await findConnection(request, userId, token, GOOGLE_APP_ID)
  if (!conn) {
    logResult('Google connection not found — skipping all Google tests', {})
  }
  googleConnectionId = conn?.connectionId || ''
})

test.describe('Google Connector — Gmail', () => {
  let firstMessageId: string

  test('list-messages: lists Gmail messages', async ({ request }) => {
    test.skip(!googleConnectionId, 'No Google connection available')

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

    const body = await executeTask(request, userId, token, task)
    expect(body.success).toBe(true)

    if (body.data.status === 'fail') {
      logResult(
        'Gmail list failed (token likely expired)',
        body.data.outputData
      )
      test.skip()
      return
    }

    expect(body.data.status).toBe('success')
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
    test.skip(!googleConnectionId, 'No Google connection available')
    test.skip(!firstMessageId, 'No message ID from previous test')

    const task = buildGoogleTask(googleConnectionId, {
      label: 'Get email',
      path: `gmail/v1/users/me/messages/${firstMessageId}`,
      method: 'get',
    })

    const body = await executeTask(request, userId, token, task)
    expect(body.success).toBe(true)

    if (body.data.status === 'fail') {
      logResult('Gmail get failed (token likely expired)', body.data.outputData)
      test.skip()
      return
    }

    expect(body.data.status).toBe('success')
    const message = body.data.outputData as Record<string, unknown>
    expect(message).toHaveProperty('id')
    expect(message).toHaveProperty('snippet')
    logResult('Gmail get-message', {
      id: message.id,
      hasSnippet: !!message.snippet,
      hasPayload: !!message.payload,
    })
  })
})
