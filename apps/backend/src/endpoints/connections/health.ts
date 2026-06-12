import { getConnectorByAppId, getConnectorById } from '@baita/shared'
import { APIGatewayProxyEvent } from 'aws-lambda'
import axios from 'axios'

import Data from '@/controllers/data'
import { ITokenCredentials, refreshOAuth2Token } from '@/utils/tokenRefresh'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''

export async function handleHealth(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<unknown> {
  const connectionId = event.pathParameters?.connectionId
  if (!connectionId) throw new Error('Missing connectionId')

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
    }

    return { status: 'error', message: 'Health check request failed' }
  }
}
