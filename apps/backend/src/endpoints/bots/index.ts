import { DataType, validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

import { handleDeploy } from './deploy'
import { handleLogs } from './logs'
import { handleRun } from './run'
import { handleTest } from './test'

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

  try {
    const userId = getAuthenticatedUserId(event)

    let data: DataType | undefined

    if (path.endsWith('/deploy')) {
      data = (await handleDeploy(event, userId)) as DataType
    } else if (path.endsWith('/test')) {
      data = (await handleTest(event, userId)) as DataType
    } else if (path.endsWith('/logs')) {
      data = (await handleLogs(event)) as DataType
    } else {
      const method = event.httpMethod
      const botId = event.pathParameters?.botId

      if (botId) {
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
            const bot = new Bot()
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
            const bot = new Bot()
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
            const bot = new Bot()
            data = await bot.createBot(userId)
            break
          }
        }
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
