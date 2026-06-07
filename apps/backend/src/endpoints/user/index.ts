import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import User from '@/controllers/user'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const user = new User()

  try {
    const method = event.httpMethod

    switch (method) {
      case 'DELETE': {
        const userId = getAuthenticatedUserId(event)
        await user.deleteUser(userId)
        api.httpResponse(callback, ApiRequestStatus.success)
        break
      }

      case 'GET': {
        const userId = getAuthenticatedUserId(event)
        const data = await user.getContent(userId)
        api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
        break
      }

      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
