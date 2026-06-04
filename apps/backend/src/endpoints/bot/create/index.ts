import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Bot from '@/controllers/bot'
import Api, { ApiRequestStatus } from '@/utils/api'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const bot = new Bot()

  try {
    const { userId } = event.pathParameters || {}

    if (!userId) {
      throw new Error('Missing userId parameter')
    }

    const data = await bot.createBot(userId)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
