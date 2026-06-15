import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Connection from '@/controllers/connection'
import Api, { ApiRequestStatus } from '@/utils/api'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const { code, state, error } = event.queryStringParameters || {}

    if (error) {
      return api.httpConnectorResponse(callback, ApiRequestStatus.fail)
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    const connection = new Connection()
    await connection.handleOAuthCallback({ code, state })

    api.httpConnectorResponse(callback, ApiRequestStatus.success)
  } catch (err: unknown) {
    api.httpConnectorResponse(callback, ApiRequestStatus.fail, err)
  }
}
