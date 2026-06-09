import { validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

const SYSTEM_USER = 'baita'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const method = event.httpMethod
    const modelId = event.pathParameters?.modelId
    const path = event.resource || ''
    const resource = new Data(SYSTEM_USER, 'model')

    let data

    if (path.endsWith('/deploy')) {
      if (!modelId) throw new Error('Missing modelId')
      const body = JSON.parse(event.body || '{}')
      const { name, author, description, image, tasks } = body
      validateTasks(tasks)
      const bot = new Bot()
      data = await bot.deployBotModel(userId, {
        modelId,
        author,
        name,
        image,
        description,
        tasks,
      })
    } else if (modelId) {
      switch (method) {
        case 'GET':
          data = await resource.read(modelId)
          break
        case 'PUT': {
          const body = JSON.parse(event.body || '{}')
          resource.validate(body)
          await resource.create(modelId, body)
          data = body
          break
        }
        case 'DELETE':
          await resource.delete(modelId)
          break
      }
    } else {
      switch (method) {
        case 'GET':
          data = await resource.list()
          break
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
