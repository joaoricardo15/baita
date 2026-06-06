/**
 * User Lifecycle E2E Test
 *
 * Part of the 'setup' project — runs before all journey specs.
 * Enforces a clean-state principle:
 * 1. Authenticate (login or signup — whichever works)
 * 2. Clean all stale resources from previous runs (bots, connections, etc.)
 * 3. Verify user starts from a blank state
 * 4. Copy Google connection for journey specs that need it
 * 5. Save auth state for subsequent specs
 */
import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import {
  API_URL,
  authHeaders,
  copyGoogleConnection,
  logResult,
  loginUser,
  signUpUser,
} from './helpers'

const authDir = path.join(__dirname, '../playwright/.auth')
const authFile = path.join(authDir, 'user.json')
const tokenFile = path.join(authDir, 'token.json')

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@baita.help'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Baita123$'

test.describe.configure({ mode: 'serial' })

test.describe('User Lifecycle Setup', () => {
  let accessToken: string
  let userId: string

  test('authenticate (login or signup)', async ({ page, request }) => {
    // Try to reuse cached token if still valid
    if (fs.existsSync(tokenFile)) {
      const cached = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'))
      if (cached.accessToken && cached.userId) {
        const checkRes = await request.post(
          `${API_URL}/user/${cached.userId}/resource/bot/list`,
          { headers: authHeaders(cached.accessToken), data: {} }
        )
        if (checkRes.status() === 200) {
          accessToken = cached.accessToken
          userId = cached.userId
          logResult('Auth', { method: 'cached token (still valid)' })
          return
        }
      }
    }

    let authenticated = false

    try {
      await loginUser(page, TEST_EMAIL, TEST_PASSWORD)
      authenticated = true
      logResult('Auth', { method: 'login' })
    } catch {
      // Login failed — user might not exist, try signup
    }

    if (!authenticated) {
      try {
        await signUpUser(page, TEST_EMAIL, TEST_PASSWORD)
        authenticated = true
        logResult('Auth', { method: 'signup' })
      } catch {
        // Signup also failed — try login one more time (Auth0 can be slow)
        await loginUser(page, TEST_EMAIL, TEST_PASSWORD)
        authenticated = true
        logResult('Auth', { method: 'login (retry)' })
      }
    }

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

    logResult('Auth complete', {
      userId,
      tokenPrefix: accessToken.slice(0, 20),
    })
  })

  test('clean slate: delete all stale resources', async ({ request }) => {
    const botsRes = await request.post(
      `${API_URL}/user/${userId}/resource/bot/list`,
      { headers: authHeaders(accessToken), data: {} }
    )
    const botsBody = await botsRes.json()
    if (botsBody.data?.length > 0) {
      for (const bot of botsBody.data) {
        if (bot.apiId) {
          await request
            .delete(
              `${API_URL}/user/${userId}/bot/${bot.botId}/api/${bot.apiId}`,
              { headers: authHeaders(accessToken) }
            )
            .catch(() => {})
        }
      }
      logResult('Clean slate', { deletedBots: botsBody.data.length })
    }

    const connectionsRes = await request.post(
      `${API_URL}/user/${userId}/resource/connection/list`,
      { headers: authHeaders(accessToken), data: {} }
    )
    const connectionsBody = await connectionsRes.json()
    if (connectionsBody.data?.length > 0) {
      for (const conn of connectionsBody.data) {
        await request
          .post(
            `${API_URL}/user/${userId}/resource/connection/delete/${conn.connectionId}`,
            { headers: authHeaders(accessToken), data: {} }
          )
          .catch(() => {})
      }
      logResult('Clean slate', {
        deletedConnections: connectionsBody.data.length,
      })
    }

    const notesRes = await request.post(
      `${API_URL}/user/${userId}/resource/note/list`,
      { headers: authHeaders(accessToken), data: {} }
    )
    const notesBody = await notesRes.json()
    if (notesBody.data?.length > 0) {
      for (const note of notesBody.data) {
        await request
          .post(
            `${API_URL}/user/${userId}/resource/note/delete/${note.noteId}`,
            { headers: authHeaders(accessToken), data: {} }
          )
          .catch(() => {})
      }
      logResult('Clean slate', { deletedNotes: notesBody.data.length })
    }

    // Drain content feed (SQS auto-deletes on read)
    await request
      .get(`${API_URL}/user/${userId}/content`, {
        headers: authHeaders(accessToken),
      })
      .catch(() => {})

    logResult('Clean slate', { status: 'all stale resources removed' })
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
