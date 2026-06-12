import { validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent } from 'aws-lambda'

import Bot from '@/controllers/bot'

export async function handleDeploy(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<unknown> {
  const modelId = event.pathParameters?.modelId
  if (!modelId) throw new Error('Missing modelId')

  const body = JSON.parse(event.body || '{}')
  const { name, author, description, image, tasks } = body

  validateTasks(tasks)

  const bot = new Bot()
  return await bot.deployBotModel(userId, {
    modelId,
    author,
    name,
    image,
    description,
    tasks,
  })
}
