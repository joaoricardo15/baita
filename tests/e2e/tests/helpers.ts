import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import fs from 'fs'
import path from 'path'
import { APIRequestContext, Page } from '@playwright/test'

// ─── Configuration ─────────────────────────────────────────────────────────
export const API_URL = process.env.API_URL || ''
export const TEST_EMAIL = 'e2e-test@baita.help'
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

// ─── Constants ─────────────────────────────────────────────────────────────
export const SYSTEM_USER = 'baita'
export const GOOGLE_APP_ID = '5c16e311-a65a-449c-ad82-1f23a41cf89c'
export const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

const APP_NAMES: Record<string, string> = {
  '5c16e311-a65a-449c-ad82-1f23a41cf89c': 'Google',
  '19c1921c-9a6b-4def-91c8-8bcba8239bf5': 'Pipedrive',
  '0f7bb503-b9b4-4fd5-80ab-9a97d52397bb': 'OpenAI',
}

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
  await request.delete(`${API_URL}/connections/${connectionId}`, {
    headers: authHeaders(token),
  })
}

export interface ICopiedConnection {
  connectionId: string
  appId: string
  appName: string
}

export async function copySystemConnections(
  request: APIRequestContext,
  _targetUserId: string,
  token: string
): Promise<ICopiedConnection[]> {
  const client = new DynamoDBClient({ region: 'us-east-1' })
  const docClient = DynamoDBDocumentClient.from(client)

  const result = await docClient.send(
    new QueryCommand({
      TableName: 'baita-backend-prod',
      KeyConditionExpression: 'userId = :uid AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':uid': SYSTEM_USER,
        ':sk': '#CONNECTION#',
      },
    })
  )

  const items = result.Items || []
  if (items.length === 0) {
    throw new Error(
      'No system connections found for baita user in DynamoDB. ' +
        'Ensure system connections are set up under the baita user.'
    )
  }

  const copied: ICopiedConnection[] = []

  for (const item of items) {
    const appId: string = item.appId || ''
    const appName: string = APP_NAMES[appId] || appId
    const { sortKey: _, userId: __, ...sourceData } = item
    const connectionId = `e2e-${appName.toLowerCase()}-${Date.now()}`

    const createRes = await request.put(
      `${API_URL}/data/connection/${connectionId}`,
      {
        headers: authHeaders(token),
        data: {
          ...sourceData,
          connectionId,
        },
      }
    )
    const createBody = await createRes.json()
    if (!createBody.success) {
      console.warn(
        `[E2E] Failed to copy ${appName} connection: ${createBody.message}`
      )
      continue
    }

    copied.push({ connectionId, appId, appName })
  }

  return copied
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
