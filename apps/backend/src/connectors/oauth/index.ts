import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import axios from 'axios'
import qs from 'qs'
import Bot from 'src/controllers/bot'
import Resource from 'src/controllers/resource'
import Api, { ApiRequestStatus } from 'src/utils/api'

import { getConnectorById } from './registry'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''

exports.handler = async (
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
    })

    const { connectionId, email } = await fetchUserInfo({
      userInfoUrl: auth.userInfoUrl,
      accessToken: credentials.access_token,
      userIdField: auth.userIdField,
      baseUrl: connector.base.url,
    })

    const newConnection = {
      userId,
      appId,
      connectionId,
      credentials,
      name: email,
      email,
    }

    const resource = new Resource(userId, 'connection')
    await resource.create(connectionId, newConnection)
    await bot.addConnection(userId, botId, connectionId, taskIndex)

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
}): Promise<Record<string, string>> {
  const data = qs.stringify({
    code: params.code,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  })

  const response = await axios.post(params.tokenUrl, data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return response.data
}

async function fetchUserInfo(params: {
  userInfoUrl: string
  accessToken: string
  userIdField: string
  baseUrl: string
}): Promise<{ connectionId: string; email: string }> {
  const url = params.userInfoUrl.startsWith('http')
    ? params.userInfoUrl
    : `${params.baseUrl}${params.userInfoUrl}`

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  })

  const data = response.data
  const connectionId = getNestedValue(data, params.userIdField)
  const email =
    data.email || data.mail || data.user?.email || String(connectionId)

  return { connectionId: String(connectionId), email }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
