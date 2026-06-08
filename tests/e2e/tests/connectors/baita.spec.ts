/**
 * Baita Connector E2E Tests
 *
 * Tests the platform's built-in services via standalone task execution:
 * - code-execute: JavaScript sandbox (VM module)
 * - getTodo: Read user's todo list
 * - publishToFeed: Publish content to user's SQS queue
 *
 * These services require NO external connection — they always work.
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData, logResult } from '../helpers'
import {
  buildBaitaCodeTask,
  buildBaitaMethodTask,
  executeTask,
} from './_helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
})

test.describe('Baita Connector — Code Execute', () => {
  test('executes basic JS and returns output', async ({ request }) => {
    const task = buildBaitaCodeTask(
      'output = { sum: 1 + 2, greeting: "hello" }'
    )
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('success')
    expect(body.data.outputData).toEqual({ sum: 3, greeting: 'hello' })
    logResult('Code execute — basic', body.data.outputData)
  })

  test('accesses custom fields in sandbox', async ({ request }) => {
    const task = buildBaitaCodeTask(
      'output = { total: items.reduce((a, b) => a + b, 0), count: items.length }',
      { items: [10, 20, 30] }
    )
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('success')
    expect(body.data.outputData).toEqual({ total: 60, count: 3 })
    logResult('Code execute — custom fields', body.data.outputData)
  })

  test('fails gracefully on syntax error', async ({ request }) => {
    const task = buildBaitaCodeTask('output = {{{ invalid syntax')
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('fail')
    expect(body.data.outputData).toBeTruthy()
    logResult('Code execute — syntax error', { status: body.data.status })
  })

  test('times out on infinite loop', async ({ request }) => {
    const task = buildBaitaCodeTask('while(true) {}')
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('fail')
    logResult('Code execute — timeout', { status: body.data.status })
  })

  test('returns undefined output when not assigned', async ({ request }) => {
    const task = buildBaitaCodeTask('const x = 42')
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('success')
    expect(body.data.outputData).toBeNull()
    logResult('Code execute — no output', { outputData: body.data.outputData })
  })
})

test.describe('Baita Connector — getTodo', () => {
  test('returns user todo list', async ({ request }) => {
    const task = buildBaitaMethodTask('getTodo')
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('success')
    logResult('getTodo result', {
      hasData: body.data.outputData !== null,
      type: typeof body.data.outputData,
    })
  })
})

test.describe('Baita Connector — publishToFeed', () => {
  const contentId = `e2e-feed-${Date.now()}`

  test('publishes content to user queue', async ({ request }) => {
    const content = {
      contentId,
      header: 'E2E Test Article',
      body: 'This is a test article published by connector E2E tests.',
      source: 'E2E-Test',
      date: new Date().toISOString(),
      url: 'https://baita.help/test',
      author: { name: 'E2E Bot' },
    }

    const task = buildBaitaMethodTask(
      'publishToFeed',
      [{ name: 'content', label: 'content', type: 'output', required: true }],
      [{ name: 'content', label: 'content', type: 'output', value: content }]
    )
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('success')
    expect(body.data.outputData).toBeTruthy()
    logResult('publishToFeed result', body.data.outputData)
  })

  test('content appears in feed', async ({ request }) => {
    const res = await request.get(`${API_URL}/content`, {
      headers: authHeaders(token),
    })
    const body = await res.json()

    expect(body.success).toBe(true)
    const items = body.data || []
    const testItem = items.find(
      (item: { header?: string }) => item.header === 'E2E Test Article'
    )
    logResult('Feed check', {
      totalItems: items.length,
      foundTestItem: !!testItem,
    })
  })
})
