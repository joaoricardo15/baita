import fs from 'fs'
import path from 'path'

export const API_URL = process.env.API_URL || 'https://api.baita.help'
export const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

export interface AuthData {
  accessToken: string
  userId: string
}

export function loadAuthData(): AuthData {
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
