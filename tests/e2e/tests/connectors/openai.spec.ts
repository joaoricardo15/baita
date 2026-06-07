/**
 * OpenAI Connector E2E Tests
 *
 * Tests OpenAI services via standalone task execution:
 * - text-completion: Generate text using GPT models
 *
 * Auth: User API key stored in a connection (userApiKey type).
 * Skips entirely if no OpenAI connection found for the test user.
 *
 * To enable: create a connection with appId '0f7bb503-b9b4-4fd5-80ab-9a97d52397bb'
 * and credentials: { apiKey: 'sk-...' }
 */
import { expect, test } from '@playwright/test'

import { loadAuthData, logResult } from '../helpers'
import { buildOpenAiTask, executeTask, findConnection } from './_helpers'

const OPENAI_APP_ID = '0f7bb503-b9b4-4fd5-80ab-9a97d52397bb'

let token: string
let openaiConnectionId: string

test.beforeAll(async ({ request }) => {
  const data = loadAuthData()
  token = data.accessToken
  const conn = await findConnection(request, token, OPENAI_APP_ID)
  if (!conn) {
    logResult('OpenAI connection not found — skipping all OpenAI tests', {})
  }
  openaiConnectionId = conn?.connectionId || ''
})

test.describe('OpenAI Connector — Text Completion', () => {
  test('generates text from a simple prompt', async ({ request }) => {
    test.skip(!openaiConnectionId, 'No OpenAI connection available')

    const task = buildOpenAiTask(openaiConnectionId, {
      label: 'Get Text Completion',
      path: 'chat/completions',
      bodyParams: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_completion_tokens: 50,
        'messages.0.role': 'user',
        'messages.0.content': 'Reply with exactly: "E2E test passed"',
      },
      outputPath: 'choices.0.message.content',
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)

    if (body.data.status === 'fail') {
      logResult('OpenAI task failed', body.data.outputData)
      test.skip()
      return
    }

    expect(body.data.status).toBe('success')
    expect(body.data.outputData).toBeTruthy()
    expect(typeof body.data.outputData).toBe('string')
    logResult('OpenAI text-completion', {
      output: (body.data.outputData as string).slice(0, 100),
    })
  })
})
