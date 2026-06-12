import { validateBot, validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

import { handleRun } from './run'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const path = event.resource || ''

  if (path.includes('/run/')) {
    return handleRun(event, api, callback)
  }

  const bot = new Bot()

  try {
    const userId = getAuthenticatedUserId(event)
    const method = event.httpMethod
    const botId = event.pathParameters?.botId

    let data

    if (path.endsWith('/deploy')) {
      const body = JSON.parse(event.body || '{}')
      if (!botId) throw new Error('Missing botId')
      const { name, active, tasks } = body
      validateTasks(tasks)
      const validation = validateBot({ tasks })
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '))
      }
      data = await bot.deployBot(userId, botId, name, active, tasks)
    } else if (path.endsWith('/test')) {
      const body = JSON.parse(event.body || '{}')
      if (!botId) throw new Error('Missing botId')
      const { task, taskIndex } = body
      if (taskIndex === undefined) throw new Error('Missing taskIndex')
      validateTasks([task])
      data = await bot.testBot(userId, botId, task, String(taskIndex))
    } else if (path.endsWith('/logs')) {
      if (!botId) throw new Error('Missing botId')
      const body = JSON.parse(event.body || '{}')
      data = await bot.getBotLogs(botId, body.searchTerms)
    } else if (botId) {
      switch (method) {
        case 'GET': {
          const resource = new Data(userId, 'bot')
          data = await resource.read(botId)
          break
        }
        case 'PATCH': {
          const body = JSON.parse(event.body || '{}')
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
        case 'DELETE': {
          const resource = new Data(userId, 'bot')
          const botRecord = await resource.read(botId)
          if (!botRecord) throw new Error('Bot not found')
          await bot.deleteBot(userId, botId)
          break
        }
      }
    } else {
      switch (method) {
        case 'GET': {
          const resource = new Data(userId, 'bot')
          data = await resource.list()
          break
        }
        case 'POST': {
          data = await bot.createBot(userId)
          break
        }
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
