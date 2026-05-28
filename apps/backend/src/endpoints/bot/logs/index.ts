import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import Bot from 'src/controllers/bot'
import Api, { ApiRequestStatus } from 'src/utils/api'

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const bot = new Bot()

  try {
    const { botId } = event.pathParameters || {}

    if (!botId) {
      throw new Error('Missing botId parameter')
    }

    const data = await bot.getBotLogs(
      botId,
      event.queryStringParameters?.searchTerm
    )

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
