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
    const userId = getAuthenticatedUserId(event)
    const method = event.httpMethod

    switch (method) {
      case 'GET': {
        const data = await user.getContent(userId)
        api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
        break
      }

      case 'PATCH': {
        const contentId = event.pathParameters?.contentId
        if (!contentId) throw new Error('Missing contentId')

        const body = JSON.parse(event.body || '{}')
        if (!body.reaction) throw new Error('Missing reaction')

        await user.reactToContent(userId, contentId, body.reaction)
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
