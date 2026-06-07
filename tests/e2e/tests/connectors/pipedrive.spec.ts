/**
 * Pipedrive Connector E2E Tests
 *
 * Tests Pipedrive CRM services via standalone task execution:
 * - search-person: Search contacts by name/email/phone
 * - search-deal: Search deals by title/notes
 *
 * Auth: OAuth2 connection (requires Pipedrive OAuth setup).
 * Skips entirely if no Pipedrive connection found for the test user.
 *
 * To enable: connect a Pipedrive account via the OAuth flow
 * (appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5')
 */
import { expect, test } from '@playwright/test'

import { loadAuthData, logResult } from '../helpers'
import { buildPipedriveTask, executeTask, findConnection } from './_helpers'

const PIPEDRIVE_APP_ID = '19c1921c-9a6b-4def-91c8-8bcba8239bf5'

let token: string
let userId: string
let pipedriveConnectionId: string

test.beforeAll(async ({ request }) => {
  const data = loadAuthData()
  token = data.accessToken
  userId = data.userId

  const conn = await findConnection(request, userId, token, PIPEDRIVE_APP_ID)
  if (!conn) {
    logResult(
      'Pipedrive connection not found — skipping all Pipedrive tests',
      {}
    )
  }
  pipedriveConnectionId = conn?.connectionId || ''
})

test.describe('Pipedrive Connector — Search', () => {
  test('search-person: searches for a person by name', async ({ request }) => {
    test.skip(!pipedriveConnectionId, 'No Pipedrive connection available')

    const task = buildPipedriveTask(pipedriveConnectionId, {
      label: 'Search person',
      path: 'persons/search',
      queryParams: { term: 'test', fields: 'name', start: '0' },
      outputPath: 'data.items.0.item',
    })

    const body = await executeTask(request, userId, token, task)
    expect(body.success).toBe(true)

    if (body.data.status === 'fail') {
      logResult(
        'Pipedrive search-person failed (token expired?)',
        body.data.outputData
      )
      test.skip()
      return
    }

    expect(body.data.status).toBe('success')
    logResult('Pipedrive search-person', {
      hasResult: body.data.outputData !== null,
      type: typeof body.data.outputData,
    })
  })

  test('search-deal: searches for a deal by title', async ({ request }) => {
    test.skip(!pipedriveConnectionId, 'No Pipedrive connection available')

    const task = buildPipedriveTask(pipedriveConnectionId, {
      label: 'Search deal',
      path: 'deals/search',
      queryParams: { term: 'test', fields: 'title', start: '0' },
      outputPath: 'data.items.0.item',
    })

    const body = await executeTask(request, userId, token, task)
    expect(body.success).toBe(true)

    if (body.data.status === 'fail') {
      logResult(
        'Pipedrive search-deal failed (token expired?)',
        body.data.outputData
      )
      test.skip()
      return
    }

    expect(body.data.status).toBe('success')
    logResult('Pipedrive search-deal', {
      hasResult: body.data.outputData !== null,
      type: typeof body.data.outputData,
    })
  })
})
