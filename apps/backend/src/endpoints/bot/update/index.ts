import { validateTasks } from '@baita/shared'
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
    const { userId, botId } = event.pathParameters || {}

    if (!userId || !botId) {
      throw new Error('Missing required path parameters')
    }

    const body = JSON.parse(event.body || '{}')

    const { name, image, description, active, tasks } = body

    validateTasks(tasks)

    const data = await bot.updateBot(
      userId,
      botId,
      name,
      image,
      description,
      active,
      tasks
    )

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
