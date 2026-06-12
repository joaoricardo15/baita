import { Locator, Page } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData } from '../helpers'

export function getAuth() {
  return loadAuthData()
}

export function getApiHeaders() {
  const { accessToken } = getAuth()
  return authHeaders(accessToken)
}

export { API_URL }

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle')

  const skeletons = page.locator('.MuiSkeleton-root')
  const count = await skeletons.count()
  if (count > 0) {
    await skeletons
      .first()
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {})
  }

  await page.waitForTimeout(300)
}

export function maskElements(page: Page, selectors: string[]): Locator[] {
  return selectors.map((s) => page.locator(s))
}
