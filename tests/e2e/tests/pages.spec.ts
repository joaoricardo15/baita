import { test, expect } from '@playwright/test'

const AUTHENTICATED_PAGES = [
  { path: '/todo', name: 'Todo' },
  { path: '/feed', name: 'Feed' },
  { path: '/bots', name: 'Bots' },
  { path: '/notes', name: 'Notes' },
  { path: '/place', name: 'Places' },
  { path: '/profile', name: 'Profile' },
]

const PUBLIC_PAGES = [
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/install', name: 'Install' },
  { path: '/404', name: 'Not Found' },
]

const ALL_PAGES = [...AUTHENTICATED_PAGES, ...PUBLIC_PAGES]

for (const { path, name } of ALL_PAGES) {
  test(`${name} (${path}) renders without errors`, async ({ page }) => {
    const errors: string[] = []
    const networkFailures: string[] = []

    page.on('pageerror', (err) => errors.push(err.message))
    page.on('requestfailed', (req) => {
      const url = req.url()
      if (url.includes('google-analytics') || url.includes('googletagmanager'))
        return
      networkFailures.push(`${req.method()} ${url}`)
    })

    await page.goto(path, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(500)

    expect(errors, `Page errors on ${path}: ${errors.join(', ')}`).toHaveLength(
      0
    )
    expect(
      networkFailures,
      `Network failures on ${path}: ${networkFailures.join(', ')}`
    ).toHaveLength(0)
  })
}
