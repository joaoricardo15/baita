import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { fromIni } from '@aws-sdk/credential-providers'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import fs from 'fs'
import path from 'path'
import { APIRequestContext, Page } from '@playwright/test'

export const API_URL = process.env.API_URL || 'https://api.baita.help'
export const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

export const TEST_EMAIL = 'e2e-test@baita.help'
export const TEST_PASSWORD = 'BaitaE2e!2024'

export const GOOGLE_CONNECTION_SOURCE_USER = '110944657139284874166'
export const GOOGLE_APP_ID = '5c16e311-a65a-449c-ad82-1f23a41cf89c'

export interface IAuthData {
  accessToken: string
  userId: string
}

export function loadAuthData(): IAuthData {
  if (!fs.existsSync(tokenFile)) {
    throw new Error(
      'No token found. Run the setup project first (user-lifecycle.spec.ts).'
    )
  }
  const data = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'))
  if (!data.accessToken) {
    throw new Error('Token file exists but accessToken is missing.')
  }
  return { accessToken: data.accessToken, userId: data.userId }
}

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function deleteConnection(
  request: APIRequestContext,
  token: string,
  connectionId: string
): Promise<void> {
  await request.post(`${API_URL}/resource/connection/delete/${connectionId}`, {
    headers: authHeaders(token),
    data: {},
  })
}

export async function copyGoogleConnection(
  request: APIRequestContext,
  targetUserId: string,
  token: string
): Promise<{ connectionId: string }> {
  const client = new DynamoDBClient({
    region: 'us-east-1',
    ...(process.env.AWS_ACCESS_KEY_ID
      ? {}
      : { credentials: fromIni({ profile: 'baita' }) }),
  })
  const docClient = DynamoDBDocumentClient.from(client)

  const result = await docClient.send(
    new GetCommand({
      TableName: 'baita-help-prod',
      Key: {
        userId: GOOGLE_CONNECTION_SOURCE_USER,
        sortKey: `#CONNECTION#${GOOGLE_CONNECTION_SOURCE_USER}`,
      },
    })
  )

  if (!result.Item) {
    throw new Error(
      'Source Google connection not found in DynamoDB. Ensure admin user has Google connected.'
    )
  }

  const { sortKey: _, userId: __, ...sourceData } = result.Item
  const connectionId = `google-e2e-${Date.now()}`
  const createRes = await request.post(
    `${API_URL}/resource/connection/create/${connectionId}`,
    {
      headers: authHeaders(token),
      data: {
        ...sourceData,
        connectionId,
        userId: targetUserId,
      },
    }
  )
  const createBody = await createRes.json()
  if (!createBody.success) {
    throw new Error(`Failed to copy Google connection: ${createBody.message}`)
  }

  return { connectionId }
}

async function navigateToAuth0(page: Page): Promise<void> {
  await page.goto('/')
  const loginButton = page.locator(
    'button:has-text("Log in"), button:has-text("Entrar"), a:has-text("Log in")'
  )
  await loginButton.first().click()
  await page.waitForURL(/auth0|auth\.baita\.help/, { timeout: 10000 })
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000)
}

async function fillAuth0Credentials(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const emailInput = page.locator(
    'input[name="username"], input[name="email"], input[type="email"]'
  )
  await emailInput.first().waitFor({ state: 'visible', timeout: 5000 })
  await emailInput.first().click()
  await emailInput.first().fill('')
  await emailInput.first().pressSequentially(email, { delay: 30 })

  const passwordInput = page.locator(
    'input[name="password"], input[type="password"]'
  )
  const passwordVisible = await passwordInput
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false)

  if (!passwordVisible) {
    const continueBtn = page.locator(
      'button[type="submit"], button:has-text("Continue")'
    )
    await continueBtn.first().click()
    await passwordInput.first().waitFor({ state: 'visible', timeout: 5000 })
  }

  await passwordInput.first().click()
  await passwordInput.first().fill('')
  await passwordInput.first().pressSequentially(password, { delay: 30 })
}

export async function signUpUser(
  page: Page,
  email: string,
  password: string
): Promise<{ usedLoginFallback: boolean }> {
  await navigateToAuth0(page)

  const signUpLink = page.locator(
    'a:has-text("Sign up"), a:has-text("Cadastrar")'
  )
  if (await signUpLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signUpLink.click()
    await page.waitForTimeout(1000)
  }

  await fillAuth0Credentials(page, email, password)

  const submitBtn = page.locator(
    'button[type="submit"], button:has-text("Continue"), button:has-text("Sign Up")'
  )
  await submitBtn.first().click()

  const acceptBtn = page.locator(
    'button:has-text("Accept"), button:has-text("Aceitar")'
  )
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click()
  }

  // If signup fails (user already exists), Auth0 shows an alert.
  // Fall back to login in that case.
  const alert = page.locator('[role="alert"], [class*="alert"]')
  const hasError = await alert
    .filter({ hasText: /went wrong|already exists|error/i })
    .isVisible({ timeout: 3000 })
    .catch(() => false)

  if (hasError) {
    logResult('Signup failed (user may exist), falling back to login', {})
    const loginLink = page.locator('a:has-text("Log in"), a:has-text("Entrar")')
    await loginLink.first().click()
    await page.waitForTimeout(1000)
    await fillAuth0Credentials(page, email, password)
    const loginBtn = page.locator(
      'button[type="submit"], button:has-text("Continue")'
    )
    await loginBtn.first().click()
    if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptBtn.click()
    }
  }

  await page.waitForURL(/localhost:3000|www\.baita\.help/, { timeout: 20000 })
  await page.waitForLoadState('domcontentloaded')
  return { usedLoginFallback: hasError }
}

export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await navigateToAuth0(page)
      await fillAuth0Credentials(page, email, password)

      const submitBtn = page.locator(
        'button[type="submit"], button:has-text("Continue"), button:has-text("Log In")'
      )
      await submitBtn.first().click()

      const acceptBtn = page.locator(
        'button:has-text("Accept"), button:has-text("Aceitar")'
      )
      if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await acceptBtn.click()
      }

      await page.waitForURL(/localhost:3000|www\.baita\.help/, {
        timeout: 15000,
      })
      await page.waitForLoadState('domcontentloaded')
      return
    } catch (err) {
      if (attempt === 2) throw err
      logResult('Login attempt failed, retrying', { attempt })
      await page.waitForTimeout(2000)
    }
  }
}

export function logResult(label: string, data: unknown): void {
  console.log(`[E2E] ${label}:`, JSON.stringify(data, null, 2))
}

const AUTH0_DOMAIN = 'dev-yc4pbydg.us.auth0.com'
const AUTH0_AUDIENCE = 'https://dev-yc4pbydg.us.auth0.com/api/v2/'

/**
 * Programmatic cleanup of stale E2E test user — no browser needed.
 * Uses Auth0 Resource Owner Password Grant to obtain a JWT for the test user,
 * then calls DELETE /user which handles ALL resource cleanup:
 * bots (Lambda, API Gateway, Scheduler, S3), SQS queue, DynamoDB records, Auth0 user.
 *
 * Requires env vars: AUTH0_E2E_CLIENT_ID, AUTH0_E2E_CLIENT_SECRET
 * (Auth0 "Regular Web Application" with Password grant enabled)
 *
 * If ROPG credentials are not available or login fails (user doesn't exist),
 * the browser-based cleanup in user-lifecycle.spec.ts handles it as fallback.
 */
export async function cleanupStaleUser(): Promise<void> {
  const clientId = process.env.AUTH0_E2E_CLIENT_ID
  const clientSecret = process.env.AUTH0_E2E_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    logResult(
      'Skipping programmatic cleanup (no AUTH0_E2E_CLIENT_ID/SECRET)',
      {}
    )
    return
  }

  logResult('Attempting ROPG login for stale user cleanup', {
    email: TEST_EMAIL,
  })

  const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      username: TEST_EMAIL,
      password: TEST_PASSWORD,
      client_id: clientId,
      client_secret: clientSecret,
      audience: AUTH0_AUDIENCE,
      scope: 'openid',
    }),
  })

  if (!tokenRes.ok) {
    const error = await tokenRes.json().catch(() => ({}))
    logResult(
      'ROPG login failed (user may not exist) — browser cleanup will handle it',
      {
        status: tokenRes.status,
        error:
          (error as Record<string, unknown>).error_description ||
          (error as Record<string, unknown>).error,
      }
    )
    return
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    logResult(
      'ROPG returned no access_token — browser cleanup will handle it',
      {}
    )
    return
  }

  logResult('ROPG login successful, calling DELETE /user endpoint', {})

  const deleteRes = await fetch(`${API_URL}/user`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  const deleteBody = await deleteRes.json().catch(() => ({}))
  logResult('DELETE /user response', {
    status: deleteRes.status,
    success: (deleteBody as Record<string, unknown>).success,
    message: (deleteBody as Record<string, unknown>).message,
  })

  if (deleteRes.ok) {
    logResult('Stale user deleted via endpoint (all resources cleaned)', {})
  }
}
