import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { fromIni } from '@aws-sdk/credential-providers'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import fs from 'fs'
import path from 'path'
import { APIRequestContext, Page } from '@playwright/test'

export const API_URL = process.env.API_URL || 'https://api.baita.help'
export const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

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
  userId: string,
  token: string,
  connectionId: string
): Promise<void> {
  await request.post(
    `${API_URL}/user/${userId}/resource/connection/delete/${connectionId}`,
    { headers: authHeaders(token), data: {} }
  )
}

export async function copyGoogleConnection(
  request: APIRequestContext,
  targetUserId: string,
  token: string
): Promise<{ connectionId: string }> {
  const client = new DynamoDBClient({
    region: 'us-east-1',
    credentials: fromIni({ profile: 'baita' }),
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
    `${API_URL}/user/${targetUserId}/resource/connection/create/${connectionId}`,
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
  await emailInput.first().fill(email)

  const passwordInput = page.locator(
    'input[name="password"], input[type="password"]'
  )
  const passwordVisible = await passwordInput
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false)

  if (!passwordVisible) {
    // Identifier-first flow: submit email, then fill password
    const continueBtn = page.locator(
      'button[type="submit"], button:has-text("Continue")'
    )
    await continueBtn.first().click()
    await passwordInput.first().waitFor({ state: 'visible', timeout: 5000 })
  }

  await passwordInput.first().fill(password)
}

export async function signUpUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
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

  // Accept consent if shown
  const acceptBtn = page.locator(
    'button:has-text("Accept"), button:has-text("Aceitar")'
  )
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click()
  }

  await page.waitForURL(/localhost|baita\.help/, { timeout: 20000 })
  await page.waitForLoadState('domcontentloaded')
}

export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await navigateToAuth0(page)

  await fillAuth0Credentials(page, email, password)

  const submitBtn = page.locator(
    'button[type="submit"], button:has-text("Continue"), button:has-text("Log In")'
  )
  await submitBtn.first().click()

  // Accept consent if shown
  const acceptBtn = page.locator(
    'button:has-text("Accept"), button:has-text("Aceitar")'
  )
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click()
  }

  await page.waitForURL(/localhost|baita\.help/, { timeout: 20000 })
  await page.waitForLoadState('domcontentloaded')
}

export function logResult(label: string, data: unknown): void {
  console.log(`[E2E] ${label}:`, JSON.stringify(data, null, 2))
}
