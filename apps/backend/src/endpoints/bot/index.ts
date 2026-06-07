import { validateBot, validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Bot from '@/controllers/bot'
import Resource from '@/controllers/resource'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

const OPERATIONS = [
  'create',
  'update',
  'delete',
  'deploy',
  'test',
  'logs',
  'model',
]

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const bot = new Bot()

  try {
    const userId = getAuthenticatedUserId(event)
    const operation = event.pathParameters?.botId
    const botId = event.pathParameters?.id

    if (!operation || !OPERATIONS.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}`)
    }

    const body = JSON.parse(event.body || '{}')
    let data

    switch (operation) {
      case 'create':
        data = await bot.createBot(userId)
        break

      case 'update': {
        if (!botId) throw new Error('Missing botId')
        const { name, image, description, active, tasks } = body
        validateTasks(tasks)
        data = await bot.updateBot(
          userId,
          botId,
          name,
          image,
          description,
          active,
          tasks
        )
        break
      }

      case 'delete': {
        if (!botId) throw new Error('Missing botId')
        const resource = new Resource(userId, 'bot')
        const botRecord = await resource.read(botId)
        if (!botRecord?.apiId) throw new Error('Bot not found')
        await bot.deleteBot(userId, botId, botRecord.apiId as string)
        break
      }

      case 'deploy': {
        if (!botId) throw new Error('Missing botId')
        const { name, active, tasks } = body
        validateTasks(tasks)
        const validation = validateBot({ tasks })
        if (!validation.valid) {
          throw new Error(validation.errors.join('; '))
        }
        data = await bot.deployBot(userId, botId, name, active, tasks)
        break
      }

      case 'test': {
        if (!botId) throw new Error('Missing botId')
        const { task, taskIndex } = body
        if (taskIndex === undefined) throw new Error('Missing taskIndex')
        validateTasks([task])
        data = await bot.testBot(userId, botId, task, String(taskIndex))
        break
      }

      case 'logs': {
        if (!botId) throw new Error('Missing botId')
        data = await bot.getBotLogs(botId, body.searchTerms)
        break
      }

      case 'model': {
        const { modelId, name, author, description, image, tasks } = body
        if (!modelId) throw new Error('Missing modelId')
        validateTasks(tasks)
        data = await bot.deployBotModel(userId, {
          modelId,
          author,
          name,
          image,
          description,
          tasks,
        })
        break
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
