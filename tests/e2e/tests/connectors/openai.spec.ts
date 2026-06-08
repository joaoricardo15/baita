/**
 * OpenAI Connector E2E Tests
 *
 * Tests OpenAI services via standalone task execution:
 * - text-completion: Generate text using GPT models
 *
 * Auth: User API key stored in a connection (userApiKey type, copied from admin).
 * Fails hard if connection is broken — never skips silently.
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
  expect(
    conn,
    'OpenAI connection not found — setup must copy admin connections before connector tests run'
  ).toBeTruthy()
  openaiConnectionId = conn!.connectionId
})

test.describe('OpenAI Connector — Text Completion', () => {
  test('generates text from a simple prompt', async ({ request }) => {
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
    expect(
      body.data.status,
      `OpenAI API failed: ${String(body.data.outputData)}. ` +
        'Admin must update OpenAI API key at https://baita.help → Connections.'
    ).toBe('success')
    expect(body.data.outputData).toBeTruthy()
    expect(typeof body.data.outputData).toBe('string')
    logResult('OpenAI text-completion', {
      output: (body.data.outputData as string).slice(0, 100),
    })
  })
})
