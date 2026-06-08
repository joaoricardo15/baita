/**
 * User Lifecycle E2E Test
 *
 * Part of the 'setup' project — runs before all journey specs.
 * Uses a FIXED test email to ensure cleanup across runs:
 * 1. Try to log in (user may exist from a previous failed run)
 * 2. If login works → delete account via centralized DELETE /user endpoint
 * 3. Sign up fresh → guaranteed clean slate
 * 4. Verify Auth0 Post-Login Action provisioned the user (DynamoDB + SQS)
 * 5. Copy admin OAuth connections for journey specs that need them
 *
 * User provisioning is handled automatically by the Auth0 Post-Login Action
 * which calls POST /user with an API key on first login (signup).
 *
 * Cleanup is ALWAYS performed via the DELETE /user endpoint which
 * handles: bots, SQS queues, all DynamoDB records, and Auth0 user deletion.
 */
import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import {
  API_URL,
  authHeaders,
  cleanupStaleUser,
  copyAdminConnections,
  loginUser,
  logResult,
  signUpUser,
  TEST_EMAIL,
  TEST_PASSWORD,
} from './helpers'

const authDir = path.join(__dirname, '../playwright/.auth')
const authFile = path.join(authDir, 'user.json')
const tokenFile = path.join(authDir, 'token.json')

test.describe.configure({ mode: 'serial' })

test.describe('User Lifecycle Setup', () => {
  let accessToken: string
  let userId: string

  test('clean up stale user from previous run', async ({ page, request }) => {
    // First: programmatic cleanup via Auth0 ROPG + DELETE /user endpoint
    await cleanupStaleUser()

    // Fallback: browser-based cleanup in case programmatic missed it
    try {
      await loginUser(page, TEST_EMAIL, TEST_PASSWORD)

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

      if (tokenData?.accessToken && tokenData?.userId) {
        logResult(
          'Stale user found via browser, deleting via DELETE /user endpoint',
          {
            userId: tokenData.userId,
          }
        )
        const deleteRes = await request.delete(`${API_URL}/user`, {
          headers: authHeaders(tokenData.accessToken),
        })
        const deleteBody = await deleteRes.json()
        logResult('Delete endpoint response', {
          success: deleteBody.success,
          message: deleteBody.message,
        })
        await page.waitForTimeout(5000)
      }
    } catch {
      logResult(
        'No stale user via browser (expected after programmatic cleanup)',
        {}
      )
    }
  })

  test('create test user (signup)', async ({ page, request }) => {
    const { usedLoginFallback } = await signUpUser(
      page,
      TEST_EMAIL,
      TEST_PASSWORD
    )

    await page.waitForFunction(
      () =>
        Object.keys(localStorage).some((k) => k.startsWith('@@auth0spajs@@')),
      { timeout: 15000 }
    )

    let tokenData = await page.evaluate(() => {
      const keys = Object.keys(localStorage)
      const auth0Key = keys.find((k) => k.startsWith('@@auth0spajs@@'))
      if (!auth0Key) return null
      const data = JSON.parse(localStorage.getItem(auth0Key) || '{}')
      return {
        accessToken: data?.body?.access_token,
        userId: data?.body?.decodedToken?.user?.sub?.split('|')[1],
      }
    })

    expect(tokenData?.accessToken).toBeTruthy()
    expect(tokenData?.userId).toBeTruthy()

    // If signUpUser fell back to login, user already existed — always clean up
    if (usedLoginFallback) {
      logResult('Stale user detected (login fallback), cleaning up', {
        userId: tokenData!.userId,
      })
      await request.delete(`${API_URL}/user`, {
        headers: authHeaders(tokenData!.accessToken),
      })
      await page.waitForTimeout(5000)
      await page.context().clearCookies()
      await page.evaluate(() => localStorage.clear())
      await signUpUser(page, TEST_EMAIL, TEST_PASSWORD)
      await page.waitForFunction(
        () =>
          Object.keys(localStorage).some((k) => k.startsWith('@@auth0spajs@@')),
        { timeout: 15000 }
      )
      tokenData = await page.evaluate(() => {
        const keys = Object.keys(localStorage)
        const auth0Key = keys.find((k) => k.startsWith('@@auth0spajs@@'))
        if (!auth0Key) return null
        const data = JSON.parse(localStorage.getItem(auth0Key) || '{}')
        return {
          accessToken: data?.body?.access_token,
          userId: data?.body?.decodedToken?.user?.sub?.split('|')[1],
        }
      })
      expect(tokenData?.accessToken).toBeTruthy()
    }

    accessToken = tokenData!.accessToken
    userId = tokenData!.userId

    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
    await page.context().storageState({ path: authFile })
    fs.writeFileSync(tokenFile, JSON.stringify(tokenData, null, 2))

    logResult('Signup complete', {
      email: TEST_EMAIL,
      userId,
      tokenPrefix: accessToken.slice(0, 20),
    })
  })

  test('verify user provisioned by Auth0 Action', async ({ request }) => {
    let provisioned = false
    for (let i = 0; i < 5; i++) {
      const res = await request.get(`${API_URL}/data/todos`, {
        headers: authHeaders(accessToken),
      })
      if (res.status() === 200) {
        provisioned = true
        break
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    expect(provisioned).toBe(true)
    logResult('User provisioned via Auth0 Action', { userId })
  })

  test('verify clean state', async ({ request }) => {
    const botsRes = await request.get(`${API_URL}/bots`, {
      headers: authHeaders(accessToken),
    })
    expect(botsRes.status()).toBe(200)
    const botsBody = await botsRes.json()
    expect(botsBody.success).toBe(true)
    expect(botsBody.data).toHaveLength(0)

    const contentRes = await request.get(`${API_URL}/content`, {
      headers: authHeaders(accessToken),
    })
    expect(contentRes.status()).toBe(200)

    logResult('Clean state verified', { bots: 0, contentEndpoint: 'ok' })
  })

  test('copy admin connections to test user', async ({ request }) => {
    const connections = await copyAdminConnections(request, userId, accessToken)

    expect(connections.length).toBeGreaterThan(0)

    for (const conn of connections) {
      const healthRes = await request.post(
        `${API_URL}/connections/${conn.connectionId}/health`,
        { headers: authHeaders(accessToken), data: {} }
      )
      const healthBody = await healthRes.json()
      expect(
        healthBody.success && healthBody.data?.status !== 'expired',
        `${conn.appName} connection unhealthy after copy. ` +
          `Admin must re-authorize: https://baita.help → Connections → ${conn.appName}. ` +
          `Error: ${JSON.stringify(healthBody.data || healthBody.message)}`
      ).toBeTruthy()
      logResult(`${conn.appName} connection healthy`, {
        connectionId: conn.connectionId,
      })
    }

    logResult('Admin connections copied', {
      count: connections.length,
      apps: connections.map((c) => c.appName),
    })
  })
})
