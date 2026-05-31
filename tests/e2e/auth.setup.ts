import { test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const authFile = path.join(__dirname, 'playwright/.auth/user.json')
const tokenFile = path.join(__dirname, 'playwright/.auth/token.json')

test('authenticate', async ({ page }) => {
  await page.goto('/')
  await page
    .locator('button:has-text("Log in"), a:has-text("Log in")')
    .first()
    .click()
  await page.waitForURL(/auth0|auth\.baita\.help/)
  await page.fill(
    'input[name="username"], input[name="email"], input[type="email"]',
    process.env.TEST_EMAIL!
  )
  await page.fill(
    'input[name="password"], input[type="password"]',
    process.env.TEST_PASSWORD!
  )
  await page.click(
    'button[type="submit"], button:has-text("Continue"), button:has-text("Log In")'
  )
  await page.waitForURL(/localhost|baita\.help/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')

  // Save browser state (cookies + localStorage) for page tests
  await page.context().storageState({ path: authFile })

  // Extract access token from Auth0 SDK localStorage for API tests
  const tokenData = await page.evaluate(() => {
    const keys = Object.keys(localStorage)
    const auth0Key = keys.find((k) => k.startsWith('@@auth0spajs@@'))
    if (!auth0Key) return null
    const data = JSON.parse(localStorage.getItem(auth0Key) || '{}')
    return {
      accessToken: data?.body?.access_token,
      userId: data?.body?.decodedToken?.user?.sub?.split('|')[1],
    }
  })

  if (tokenData?.accessToken) {
    fs.writeFileSync(tokenFile, JSON.stringify(tokenData, null, 2))
  }
})
