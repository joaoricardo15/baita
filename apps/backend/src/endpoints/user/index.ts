import { validateUser } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import User from '@/controllers/user'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

const API_KEY = process.env.AUTH0_CREATE_USER_API_KEY

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
      case 'POST': {
        const providedKey =
          event.headers['x-api-key'] || event.headers['X-Api-Key']
        if (!providedKey || providedKey !== API_KEY) {
          throw new Error('Unauthorized')
        }

        const body = JSON.parse(event.body || '{}')
        const parts = body.user_id?.split('|')
        if (!parts || parts.length < 2) {
          throw new Error('Invalid user_id format')
        }

        const newUser = { userId: parts[1], ...body }
        validateUser(newUser)
        const data = await user.createUser(newUser)
        api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
        break
      }

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
