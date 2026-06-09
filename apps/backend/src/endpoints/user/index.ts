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
      // Auth0 Post-Login Action only — API key auth, no CORS, not in OpenAPI docs.
      // Called when a new user signs in for the first time.
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

        const userId = parts[1]
        const newUser = {
          name: body.name || '',
          email: body.email || '',
          picture: body.picture,
        }
        validateUser(newUser)
        const data = await user.createUser(userId, newUser)
        api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
        break
      }

      // Authenticated user account deletion — JWT auth, CORS enabled.
      case 'DELETE': {
        const userId = getAuthenticatedUserId(event)
        await user.deleteUser(userId)
        api.httpResponse(callback, ApiRequestStatus.success)
        break
      }

      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
