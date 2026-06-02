import { validateTasks } from '@baita/shared'
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
    const { userId, botId } = event.pathParameters || {}

    if (!userId || !botId) {
      throw new Error('Missing required path parameters')
    }

    const body = JSON.parse(event.body || '{}')

    const { name, author, description, image, tasks } = body

    validateTasks(tasks)

    const data = await bot.deployBotModel(userId, {
      modelId: botId,
      author,
      name,
      image,
      description,
      tasks,
    })

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
