import { validateBot, validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent } from 'aws-lambda'

import Bot from '@/controllers/bot'

export async function handleDeploy(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<unknown> {
  const botId = event.pathParameters?.botId
  if (!botId) throw new Error('Missing botId')

  const body = JSON.parse(event.body || '{}')
  const { name, active, tasks } = body

  validateTasks(tasks)
  const validation = validateBot({ tasks })
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  const bot = new Bot()
  return await bot.deployBot(userId, botId, name, active, tasks)
}
