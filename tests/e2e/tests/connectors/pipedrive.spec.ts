/**
 * Pipedrive Connector E2E Tests
 *
 * Tests Pipedrive CRM services via standalone task execution:
 * - search-person: Search contacts by name/email/phone
 * - search-deal: Search deals by title/notes
 *
 * Auth: OAuth2 connection (copied from admin in setup).
 * Fails hard if connection is broken — never skips silently.
 */
import { expect, test } from '@playwright/test'

import { loadAuthData, logResult } from '../helpers'
import { buildPipedriveTask, executeTask, findConnection } from './_helpers'

const PIPEDRIVE_APP_ID = '19c1921c-9a6b-4def-91c8-8bcba8239bf5'

let token: string
let pipedriveConnectionId: string

test.beforeAll(async ({ request }) => {
  const data = loadAuthData()
  token = data.accessToken
  const conn = await findConnection(request, token, PIPEDRIVE_APP_ID)
  expect(
    conn,
    'Pipedrive connection not found — setup must copy admin connections before connector tests run'
  ).toBeTruthy()
  pipedriveConnectionId = conn!.connectionId
})

test.describe('Pipedrive Connector — Search', () => {
  test('search-person: searches for a person by name', async ({ request }) => {
    const task = buildPipedriveTask(pipedriveConnectionId, {
      label: 'Search person',
      path: 'persons/search',
      queryParams: { term: 'test', fields: 'name', start: '0' },
      outputPath: 'data.items.0.item',
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)
    expect(
      body.data.status,
      `Pipedrive API failed: ${String(body.data.outputData)}. ` +
        'Admin must reconnect Pipedrive at https://baita.help → Connections.'
    ).toBe('success')
    logResult('Pipedrive search-person', {
      hasResult: body.data.outputData !== null,
      type: typeof body.data.outputData,
    })
  })

  test('search-deal: searches for a deal by title', async ({ request }) => {
    const task = buildPipedriveTask(pipedriveConnectionId, {
      label: 'Search deal',
      path: 'deals/search',
      queryParams: { term: 'test', fields: 'title', start: '0' },
      outputPath: 'data.items.0.item',
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)
    expect(
      body.data.status,
      `Pipedrive API failed: ${String(body.data.outputData)}. ` +
        'Admin must reconnect Pipedrive at https://baita.help → Connections.'
    ).toBe('success')
    logResult('Pipedrive search-deal', {
      hasResult: body.data.outputData !== null,
      type: typeof body.data.outputData,
    })
  })
})
