import { getConnectorByAppId, getConnectorById } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

import Data from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'
import { ITokenCredentials, refreshOAuth2Token } from '@/utils/tokenRefresh'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const method = event.httpMethod
    const connectionId = event.pathParameters?.connectionId
    const path = event.resource || ''

    let data

    if (path.endsWith('/health')) {
      if (!connectionId) throw new Error('Missing connectionId')
      data = await checkHealth(userId, connectionId)
    } else if (connectionId) {
      switch (method) {
        case 'GET':
          data = await getConnectionDetails(userId, connectionId)
          break
        case 'DELETE': {
          const resource = new Data(userId, 'connection')
          await resource.delete(connectionId)
          break
        }
      }
    } else {
      switch (method) {
        case 'GET': {
          const resource = new Data(userId, 'connection')
          data = await resource.list()
          break
        }
        case 'POST': {
          const body = JSON.parse(event.body || '{}')
          data = await createConnection(userId, body)
          break
        }
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}

async function createConnection(
  userId: string,
  body: { connectorId?: string; apiKey?: string }
) {
  const { connectorId, apiKey } = body

  if (!connectorId || !apiKey) {
    throw new Error('Missing required fields: connectorId, apiKey')
  }

  const connector = getConnectorById(connectorId)
  if (!connector || connector.auth.type !== 'userApiKey') {
    throw new Error('Invalid connector or auth type')
  }

  const newConnectionId = uuidv4()
  const newConnection = {
    userId,
    appId: connector.appId,
    connectionId: newConnectionId,
    connectorId,
    credentials: { apiKey },
    name: connector.name,
    email: '',
    createdAt: Date.now(),
  }

  const resource = new Data(userId, 'connection')
  await resource.create(newConnectionId, newConnection)

  return newConnection
}

async function getConnectionDetails(userId: string, connectionId: string) {
  const connectionResource = new Data(userId, 'connection')
  const connection = await connectionResource.read(connectionId)

  if (!connection) throw new Error('Connection not found')

  const botResource = new Data(userId, 'bot')
  const bots = (await botResource.list()) || []

  const linkedBots = bots
    .filter((bot: Record<string, unknown>) => {
      const tasks = bot.tasks as Array<{ connectionId?: string | number }>
      return tasks?.some(
        (task) => String(task.connectionId) === String(connectionId)
      )
    })
    .map((bot: Record<string, unknown>) => ({
      botId: bot.botId,
      name: bot.name,
    }))

  const { credentials: _creds, ...safeConnection } = connection

  return { connection: safeConnection, linkedBots }
}

async function checkHealth(userId: string, connectionId: string) {
  const resource = new Data(userId, 'connection')
  const connection = await resource.read(connectionId)

  if (!connection) throw new Error('Connection not found')

  const connector =
    (connection.connectorId &&
      getConnectorById(connection.connectorId as string)) ||
    getConnectorByAppId(connection.appId as string)

  if (!connector || !connector.healthCheck) {
    return { status: 'unknown', message: 'No health check configured' }
  }

  const healthUrl = connector.healthCheck.url.startsWith('http')
    ? connector.healthCheck.url
    : `${connector.base.url}${connector.healthCheck.url}`

  const credentials = connection.credentials as ITokenCredentials
  const authHeader =
    connector.auth.type === 'userApiKey'
      ? `${connector.auth.prefix || ''}${credentials.apiKey || ''}`
      : `Bearer ${credentials.access_token}`

  try {
    await axios.request({
      url: healthUrl,
      method: connector.healthCheck.method || 'GET',
      headers: { Authorization: authHeader },
    })
    return { status: 'healthy' }
  } catch (healthErr: unknown) {
    const status =
      healthErr && typeof healthErr === 'object' && 'response' in healthErr
        ? (healthErr as { response?: { status?: number } }).response?.status
        : undefined

    if (status === 401 && connector.auth.type === 'oauth2') {
      try {
        const newCredentials = await refreshOAuth2Token(
          connector,
          credentials,
          `${SERVICE_API_URL}/oauth/callback`
        )

        const { userId: _u, sortKey: _s, ...rest } = connection
        await resource.update(connectionId, {
          ...rest,
          credentials: newCredentials,
        })

        await axios.request({
          url: healthUrl,
          method: connector.healthCheck.method || 'GET',
          headers: {
            Authorization: `Bearer ${newCredentials.access_token}`,
          },
        })
        return { status: 'healthy' }
      } catch (_err: unknown) {
        return {
          status: 'expired',
          message: 'Token refresh failed — reconnection required',
        }
      }
    } else {
      return { status: 'error', message: 'Health check request failed' }
    }
  }
}
