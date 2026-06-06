/**
 * User Lifecycle E2E Test
 *
 * Part of the 'setup' project — runs before all journey specs.
 * Uses a FIXED test email to ensure cleanup across runs:
 * 1. Try to log in (user may exist from a previous failed run)
 * 2. If login works → delete account via API (cleanup stale state)
 * 3. Sign up fresh → guaranteed clean slate
 * 4. Provision user in backend (DynamoDB + SQS)
 * 5. Copy Google connection for journey specs that need it
 */
import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import {
  API_URL,
  authHeaders,
  copyGoogleConnection,
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
        logResult('Stale user found, cleaning up', {
          userId: tokenData.userId,
        })
        await request.delete(`${API_URL}/user/${tokenData.userId}`, {
          headers: authHeaders(tokenData.accessToken),
        })
        await page.waitForTimeout(2000)
      }
    } catch {
      logResult('No stale user (login failed — expected on clean run)', {})
    }
  })

  test('create test user (signup)', async ({ page }) => {
    await signUpUser(page, TEST_EMAIL, TEST_PASSWORD)

    await page.waitForFunction(
      () =>
        Object.keys(localStorage).some((k) => k.startsWith('@@auth0spajs@@')),
      { timeout: 15000 }
    )

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

    expect(tokenData?.accessToken).toBeTruthy()
    expect(tokenData?.userId).toBeTruthy()

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

  test('provision user in backend', async ({ request }) => {
    const res = await request.post(`${API_URL}/user`, {
      headers: authHeaders(accessToken),
      data: {
        user_id: `auth0|${userId}`,
        userId,
        email: TEST_EMAIL,
        name: 'E2E Test User',
      },
    })
    const body = await res.json()
    logResult('User provisioned', { success: body.success })
  })

  test('verify clean state', async ({ request }) => {
    const botsRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/list`,
      { headers: authHeaders(accessToken), data: {} }
    )
    expect(botsRes.status()).toBe(200)
    const botsBody = await botsRes.json()
    expect(botsBody.success).toBe(true)
    expect(botsBody.data).toHaveLength(0)

    const contentRes = await request.get(`${API_URL}/user/${userId}/content`, {
      headers: authHeaders(accessToken),
    })
    expect(contentRes.status()).toBe(200)

    logResult('Clean state verified', { bots: 0, contentEndpoint: 'ok' })
  })

  test('copy Google connection to test user', async ({ request }) => {
    const { connectionId } = await copyGoogleConnection(
      request,
      userId,
      accessToken
    )

    const verifyRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/read/${connectionId}`,
      { headers: authHeaders(accessToken), data: {} }
    )
    const verifyBody = await verifyRes.json()
    expect(verifyBody.success).toBe(true)
    expect(verifyBody.data.email).toContain('joaoricardocardoso15')
    logResult('Google connection copied', {
      connectionId,
      email: verifyBody.data.email,
    })
  })
})
