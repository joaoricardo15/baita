import { getConnectorByAppId, getConnectorById } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import axios from 'axios'
import Resource from 'src/controllers/resource'
import Api, { ApiRequestStatus } from 'src/utils/api'
import { ITokenCredentials, refreshOAuth2Token } from 'src/utils/tokenRefresh'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const { userId, connectionId } = event.pathParameters || {}

    if (!userId || !connectionId) {
      throw new Error('Missing userId or connectionId')
    }

    const resource = new Resource(userId, 'connection')
    const connection = await resource.read(connectionId)

    if (!connection) {
      throw new Error('Connection not found')
    }

    const connector =
      (connection.connectorId &&
        getConnectorById(connection.connectorId as string)) ||
      getConnectorByAppId(connection.appId as string)

    if (!connector) {
      api.httpResponse(callback, ApiRequestStatus.success, undefined, {
        status: 'unknown',
        message: 'No connector manifest found',
      })
      return
    }

    if (!connector.healthCheck) {
      api.httpResponse(callback, ApiRequestStatus.success, undefined, {
        status: 'unknown',
        message: 'No health check configured for this connector',
      })
      return
    }

    const healthUrl = connector.healthCheck.url.startsWith('http')
      ? connector.healthCheck.url
      : `${connector.base.url}${connector.healthCheck.url}`

    const credentials = connection.credentials as ITokenCredentials

    try {
      await axios.request({
        url: healthUrl,
        method: connector.healthCheck.method || 'GET',
        headers: { Authorization: `Bearer ${credentials.access_token}` },
      })

      api.httpResponse(callback, ApiRequestStatus.success, undefined, {
        status: 'healthy',
      })
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

          api.httpResponse(callback, ApiRequestStatus.success, undefined, {
            status: 'healthy',
          })
        } catch (_err: unknown) {
          api.httpResponse(callback, ApiRequestStatus.success, undefined, {
            status: 'expired',
            message: 'Token refresh failed — reconnection required',
          })
        }
      } else {
        api.httpResponse(callback, ApiRequestStatus.success, undefined, {
          status: 'error',
          message: 'Health check request failed',
        })
      }
    }
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
