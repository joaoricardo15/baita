import { validateTasks } from '@baita/shared'
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
    const { userId, botId, taskIndex } = event.pathParameters || {}

    if (!userId || !botId || !taskIndex) {
      throw new Error('Missing required path parameters')
    }

    const task = JSON.parse(event.body || '{}')

    validateTasks([task])

    const data = await bot.testBot(userId, botId, task, taskIndex)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
