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
    const { userId } = event.pathParameters || {}

    if (!userId) {
      throw new Error('Missing userId parameter')
    }

    const data = await user.getContent(userId)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
