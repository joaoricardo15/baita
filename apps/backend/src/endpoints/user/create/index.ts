import { validateUser } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import User from 'src/controllers/user'
import Api, { ApiRequestStatus } from 'src/utils/api'

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const user = new User()

  try {
    const body = JSON.parse(event.body || '{}')

    const parts = body.user_id?.split('|')
    if (!parts || parts.length < 2) {
      throw new Error('Invalid user_id format')
    }

    const newUser = { userId: parts[1], ...body }

    validateUser(newUser)

    const data = await user.createUser(newUser)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
