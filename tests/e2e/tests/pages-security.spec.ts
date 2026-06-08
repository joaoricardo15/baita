/**
 * Pages & Auth E2E Tests
 *
 * User Journey: Navigation & Security
 * Tests that all pages render without JS errors or network failures,
 * and that auth security gates work correctly.
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData } from './helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
})

test.describe('Authenticated Pages', () => {
  const pages = [
    { path: '/todo', name: 'Todo' },
    { path: '/feed', name: 'Feed' },
    { path: '/bots', name: 'Bots' },
    { path: '/notes', name: 'Notes' },
    { path: '/place', name: 'Places' },
    { path: '/profile', name: 'Profile' },
    { path: '/connections', name: 'Connections' },
  ]

  for (const { path, name } of pages) {
    test(`${name} (${path}) renders without errors`, async ({ page }) => {
      const errors: string[] = []
      const networkFailures: string[] = []

      page.on('pageerror', (err) => errors.push(err.message))
      page.on('requestfailed', (req) => {
        const url = req.url()
        if (
          url.includes('google-analytics') ||
          url.includes('googletagmanager')
        )
          return
        networkFailures.push(`${req.method()} ${url}`)
      })

      await page.goto(path, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(500)

      expect(
        errors,
        `Page errors on ${path}: ${errors.join(', ')}`
      ).toHaveLength(0)
      expect(
        networkFailures,
        `Network failures on ${path}: ${networkFailures.join(', ')}`
      ).toHaveLength(0)
    })
  }
})

test.describe('Public Pages', () => {
  const pages = [
    { path: '/terms', name: 'Terms' },
    { path: '/privacy', name: 'Privacy' },
    { path: '/install', name: 'Install' },
  ]

  for (const { path, name } of pages) {
    test(`${name} (${path}) renders without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(path, { waitUntil: 'networkidle', timeout: 15000 })
      expect(errors).toHaveLength(0)
    })
  }
})

test.describe('Auth Security', () => {
  test('valid token returns 200 on API', async ({ request }) => {
    const res = await request.get(`${API_URL}/data/todo`, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
  })

  test('invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/content`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    })
    expect(res.status()).toBe(401)
  })

  test('no token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/content`)
    expect(res.status()).toBe(401)
  })

  test('CORS headers present on error responses', async ({ request }) => {
    const res = await request.get(`${API_URL}/content`, {
      headers: {
        Authorization: 'Bearer bad',
        Origin: 'https://www.baita.help',
      },
    })
    expect(res.status()).toBe(401)
    expect(res.headers()['access-control-allow-origin']).toBe(
      'https://www.baita.help'
    )
  })
})
