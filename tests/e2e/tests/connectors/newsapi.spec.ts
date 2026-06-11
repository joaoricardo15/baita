/**
 * NewsAPI Connector E2E Tests
 *
 * Tests NewsAPI services via standalone task execution:
 * - top-headlines: Get top headlines by country
 * - everything: Search all news by keyword
 *
 * Auth: Server-side API key (NEWS_API_KEY env var). No user connection needed.
 * These tests always work when the backend has a valid NewsAPI key.
 */
import { expect, test } from '@playwright/test'

import { loadAuthData, logResult } from '../helpers'
import { buildNewsApiTask, executeTask } from './_helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
})

test.describe('NewsAPI Connector — Top Headlines', () => {
  test('gets US top headlines', async ({ request }) => {
    const task = buildNewsApiTask({
      label: 'Get top headlines',
      path: 'top-headlines',
      queryParams: { country: 'us', pageSize: '5' },
      outputPath: 'articles',
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)

    if (body.data.status === 'fail') {
      const err = body.data.outputData as string
      if (err?.includes?.('rateLimited') || err?.includes?.('429')) {
        logResult('NewsAPI rate limited — skipping', {})
        test.skip()
        return
      }
    }

    expect(body.data.status).toBe('success')
    const articles = body.data.outputData as unknown[]
    expect(Array.isArray(articles)).toBe(true)
    expect(articles.length).toBeGreaterThan(0)

    const first = articles[0] as Record<string, unknown>
    expect(first).toHaveProperty('header')
    expect(first).toHaveProperty('url')
    logResult('NewsAPI top-headlines', {
      count: articles.length,
      firstHeader: (first.header as string)?.slice(0, 60),
    })
  })

  test('applies outputMapping to produce content format', async ({
    request,
  }) => {
    const task = buildNewsApiTask({
      label: 'Get top headlines',
      path: 'top-headlines',
      queryParams: { country: 'us', pageSize: '3' },
      outputPath: 'articles',
      outputMapping: {
        source: '###NewsAPI',
        contentId: 'publishedAt',
        header: 'title',
        body: 'description',
        image: 'urlToImage',
        date: 'publishedAt',
        url: 'url',
        'author.name': 'source.name',
      },
    })

    const body = await executeTask(request, token, task)

    if (body.data.status === 'fail') {
      logResult('NewsAPI rate limited — skipping', {})
      test.skip()
      return
    }

    expect(body.data.status).toBe('success')
    const items = body.data.outputData as Record<string, unknown>[]
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)

    const first = items[0]
    expect(first).toHaveProperty('header')
    expect(first).toHaveProperty('source', 'NewsAPI')
    expect(first).toHaveProperty('contentId')
    logResult('NewsAPI outputMapping', {
      header: (first.header as string)?.slice(0, 60),
      source: first.source,
      hasDate: !!first.date,
    })
  })
})

test.describe('NewsAPI Connector — Everything', () => {
  test('searches news by keyword', async ({ request }) => {
    const task = buildNewsApiTask({
      label: 'Get news',
      path: 'everything',
      queryParams: { q: 'technology', language: 'en', pageSize: '5' },
      outputPath: 'articles',
    })

    const body = await executeTask(request, token, task)
    expect(body.success).toBe(true)

    if (body.data.status === 'fail') {
      logResult('NewsAPI rate limited — skipping', {})
      test.skip()
      return
    }

    expect(body.data.status).toBe('success')
    const articles = body.data.outputData as unknown[]
    expect(Array.isArray(articles)).toBe(true)
    expect(articles.length).toBeGreaterThan(0)
    logResult('NewsAPI everything', { count: articles.length })
  })
})
