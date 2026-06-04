import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import axios from 'axios'
import qs from 'qs'

import Bot from '@/controllers/bot'
import Resource from '@/controllers/resource'
import Api, { ApiRequestStatus } from '@/utils/api'

import { getConnectorById } from './registry'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const bot = new Bot()

  try {
    const { code, state, error } = event.queryStringParameters || {}

    if (error) {
      return api.httpConnectorResponse(callback, ApiRequestStatus.fail)
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    const { userId, appId, botId, taskIndex, connectorId } =
      deconstructState(state)

    const connector = getConnectorById(connectorId)
    if (!connector || connector.auth.type !== 'oauth2') {
      throw new Error(`Unknown or non-OAuth connector: ${connectorId}`)
    }

    const { auth } = connector
    const clientId = process.env[auth.clientIdEnvVar] || ''
    const clientSecret = process.env[auth.clientSecretEnvVar] || ''

    const credentials = await exchangeCodeForTokens({
      tokenUrl: auth.tokenUrl,
      code,
      clientId,
      clientSecret,
      redirectUri: `${SERVICE_API_URL}/connectors/oauth`,
      tokenAuthMethod: auth.tokenAuthMethod || 'body',
    })

    const { connectionId, email, name } = await fetchUserInfo({
      userInfoUrl: auth.userInfoUrl,
      accessToken: credentials.access_token,
      userIdField: auth.userIdField,
      baseUrl: connector.base.url,
    })

    const newConnection = {
      userId,
      appId,
      connectionId,
      connectorId,
      credentials,
      name,
      email,
      createdAt: Date.now(),
    }

    const resource = new Resource(userId, 'connection')
    await resource.create(connectionId, newConnection)

    if (botId) {
      await bot.addConnection(userId, botId, connectionId, taskIndex)
    }

    api.httpConnectorResponse(callback, ApiRequestStatus.success)
  } catch (err: unknown) {
    api.httpConnectorResponse(callback, ApiRequestStatus.fail, err)
  }
}

function deconstructState(state: string): {
  appId: string
  userId: string
  botId: string
  taskIndex: number
  connectorId: string
} {
  const parts = state.split(':')
  return {
    appId: parts[0],
    userId: parts[1],
    botId: parts[2],
    taskIndex: Number(parts[3]),
    connectorId: parts[4] || '',
  }
}

async function exchangeCodeForTokens(params: {
  tokenUrl: string
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
  tokenAuthMethod: 'basic' | 'body'
}): Promise<Record<string, string>> {
  const body: Record<string, string> = {
    code: params.code,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
  }

  if (params.tokenAuthMethod === 'body') {
    body.client_id = params.clientId
    body.client_secret = params.clientSecret
  }

  const data = qs.stringify(body)

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  if (params.tokenAuthMethod === 'basic') {
    const encoded = Buffer.from(
      `${params.clientId}:${params.clientSecret}`
    ).toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  }

  const response = await axios.post(params.tokenUrl, data, { headers })

  return response.data
}

async function fetchUserInfo(params: {
  userInfoUrl: string
  accessToken: string
  userIdField: string
  baseUrl: string
}): Promise<{ connectionId: string; email: string; name: string }> {
  const url = params.userInfoUrl.startsWith('http')
    ? params.userInfoUrl
    : `${params.baseUrl}${params.userInfoUrl}`

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  const data = response.data
  const connectionId = getNestedValue(data, params.userIdField)

  const parentPath = params.userIdField.split('.').slice(0, -1).join('.')
  const userObj = parentPath
    ? (getNestedValue(data, parentPath) as Record<string, unknown>)
    : data

  const email =
    (userObj?.email as string) ||
    (userObj?.mail as string) ||
    data.email ||
    String(connectionId)

  const name =
    (userObj?.name as string) ||
    (userObj?.email as string) ||
    String(connectionId)

  return { connectionId: String(connectionId), email, name }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
