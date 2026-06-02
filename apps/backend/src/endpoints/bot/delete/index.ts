import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import Bot from '@/controllers/bot'
import Api, { ApiRequestStatus } from '@/utils/api'

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const bot = new Bot()

  try {
    const { userId, botId, apiId } = event.pathParameters || {}

    if (!userId || !botId || !apiId) {
      throw new Error('Missing required path parameters')
    }

    await bot.deleteBot(userId, botId, apiId)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, undefined)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
