import { getConnectorById } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

import Resource from '@/controllers/resource'
import Api, { ApiRequestStatus } from '@/utils/api'

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const { userId } = event.pathParameters || {}
    const body = JSON.parse(event.body || '{}')
    const { connectorId, apiKey } = body

    if (!userId || !connectorId || !apiKey) {
      throw new Error('Missing required fields: connectorId, apiKey')
    }

    const connector = getConnectorById(connectorId)
    if (!connector || connector.auth.type !== 'userApiKey') {
      throw new Error('Invalid connector or auth type')
    }

    const connectionId = uuidv4()
    const newConnection = {
      userId,
      appId: connector.appId,
      connectionId,
      connectorId,
      credentials: { apiKey },
      name: connector.name,
      email: '',
      createdAt: Date.now(),
    }

    const resource = new Resource(userId, 'connection')
    await resource.create(connectionId, newConnection)

    api.httpResponse(
      callback,
      ApiRequestStatus.success,
      undefined,
      newConnection
    )
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
