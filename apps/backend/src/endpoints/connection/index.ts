import { getConnectorByAppId, getConnectorById } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

import Resource from '@/controllers/resource'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/authGuard'
import { ITokenCredentials, refreshOAuth2Token } from '@/utils/tokenRefresh'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''

const OPERATIONS = ['create', 'health', 'details']

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const operation = event.pathParameters?.connectionId
    const connectionId = event.pathParameters?.id

    if (!operation || !OPERATIONS.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}`)
    }

    const body = JSON.parse(event.body || '{}')
    let data

    switch (operation) {
      case 'create': {
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

        const resource = new Resource(userId, 'connection')
        await resource.create(newConnectionId, newConnection)

        data = newConnection
        break
      }

      case 'health': {
        if (!connectionId) throw new Error('Missing connectionId')

        const resource = new Resource(userId, 'connection')
        const connection = await resource.read(connectionId)

        if (!connection) throw new Error('Connection not found')

        const connector =
          (connection.connectorId &&
            getConnectorById(connection.connectorId as string)) ||
          getConnectorByAppId(connection.appId as string)

        if (!connector || !connector.healthCheck) {
          data = { status: 'unknown', message: 'No health check configured' }
          break
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
          data = { status: 'healthy' }
        } catch (healthErr: unknown) {
          const status =
            healthErr &&
            typeof healthErr === 'object' &&
            'response' in healthErr
              ? (healthErr as { response?: { status?: number } }).response
                  ?.status
              : undefined

          if (status === 401 && connector.auth.type === 'oauth2') {
            try {
              const newCredentials = await refreshOAuth2Token(
                connector,
                credentials,
                `${SERVICE_API_URL}/connectors/oauth`
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
              data = { status: 'healthy' }
            } catch (_err: unknown) {
              data = {
                status: 'expired',
                message: 'Token refresh failed — reconnection required',
              }
            }
          } else {
            data = { status: 'error', message: 'Health check request failed' }
          }
        }
        break
      }

      case 'details': {
        if (!connectionId) throw new Error('Missing connectionId')

        const connectionResource = new Resource(userId, 'connection')
        const connection = await connectionResource.read(connectionId)

        if (!connection) throw new Error('Connection not found')

        const botResource = new Resource(userId, 'bot')
        const bots = (await botResource.list()) || []

        const linkedBots = bots
          .filter((bot: Record<string, unknown>) => {
            const tasks = bot.tasks as Array<{
              connectionId?: string | number
            }>
            return tasks?.some(
              (task) => String(task.connectionId) === String(connectionId)
            )
          })
          .map((bot: Record<string, unknown>) => ({
            botId: bot.botId,
            name: bot.name,
          }))

        const { credentials: _creds, ...safeConnection } = connection

        data = { connection: safeConnection, linkedBots }
        break
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
