import { DataType } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Connection from '@/controllers/connection'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

import { handleHealth } from './health'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const path = event.resource || ''
    const connection = new Connection()

    let data: DataType | undefined

    if (path.endsWith('/health')) {
      data = (await handleHealth(event, userId)) as DataType
    } else {
      const method = event.httpMethod
      const connectionId = event.pathParameters?.connectionId

      if (connectionId) {
        switch (method) {
          case 'GET':
            data = (await connection.getConnectionDetails(
              userId,
              connectionId
            )) as DataType
            break
          case 'DELETE':
            await connection.deleteConnection(userId, connectionId)
            break
        }
      } else {
        switch (method) {
          case 'GET':
            data = await connection.listConnections(userId)
            break
          case 'POST': {
            const body = JSON.parse(event.body || '{}')
            data = (await connection.createConnection(
              userId,
              body.connectorId,
              body.apiKey
            )) as DataType
            break
          }
        }
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
