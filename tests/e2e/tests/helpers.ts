import fs from 'fs'
import path from 'path'
import { APIRequestContext } from '@playwright/test'

export const API_URL = process.env.API_URL || 'https://api.baita.help'
export const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

export interface IAuthData {
  accessToken: string
  userId: string
}

export function loadAuthData(): IAuthData {
  if (!fs.existsSync(tokenFile)) {
    throw new Error('No access token found. Run auth.setup.ts first.')
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
