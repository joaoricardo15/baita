import { IConnectorManifest } from '@baita/shared'
import axios from 'axios'
import qs from 'qs'

export interface ITokenCredentials {
  access_token: string
  refresh_token?: string
  token_type?: string
  [key: string]: unknown
}

export async function refreshOAuth2Token(
  connector: IConnectorManifest,
  credentials: ITokenCredentials,
  redirectUri: string
): Promise<ITokenCredentials> {
  if (connector.auth.type !== 'oauth2') {
    throw new Error('Connector does not use OAuth2')
  }

  const { auth } = connector
  const refreshUrl = auth.refreshUrl || auth.tokenUrl

  if (!credentials.refresh_token) {
    throw new Error('No refresh token available')
  }

  const clientId = process.env[auth.clientIdEnvVar]
  const clientSecret = process.env[auth.clientSecretEnvVar]

  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing OAuth credentials: ${auth.clientIdEnvVar} or ${auth.clientSecretEnvVar} not set`
    )
  }

  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: credentials.refresh_token,
    redirect_uri: redirectUri,
  }

  if ((auth.tokenAuthMethod || 'body') === 'body') {
    body.client_id = clientId
    body.client_secret = clientSecret
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  if (auth.tokenAuthMethod === 'basic') {
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )
    headers['Authorization'] = `Basic ${encoded}`
  }

  const response = await axios.post(refreshUrl, qs.stringify(body), { headers })

  return {
    ...credentials,
    access_token: response.data.access_token,
    ...(response.data.refresh_token && {
      refresh_token: response.data.refresh_token,
    }),
    ...(response.data.token_type && {
      token_type: response.data.token_type,
    }),
  }
}
