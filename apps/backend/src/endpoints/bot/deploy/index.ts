import { validateBot } from '@baita/shared'
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
    const { userId, botId } = event.pathParameters || {}

    if (!userId || !botId) {
      throw new Error('Missing required path parameters')
    }

    const body = JSON.parse(event.body || '{}')

    const { name, active, tasks } = body

    validateTasks(tasks)

    const validation = validateBot({
      botId,
      userId,
      apiId: '',
      name: name || '',
      active: active || false,
      triggerUrl: '',
      triggerSamples: [],
      tasks,
    })
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '))
    }

    const data = await bot.deployBot(userId, botId, name, active, tasks)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
