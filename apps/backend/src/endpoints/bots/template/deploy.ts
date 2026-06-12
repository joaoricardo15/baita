import { validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent } from 'aws-lambda'

import Bot from '@/controllers/bot'

export async function handleDeploy(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<unknown> {
  const templateId = event.pathParameters?.templateId
  if (!templateId) throw new Error('Missing templateId')

  const body = JSON.parse(event.body || '{}')
  const { name, author, description, image, tasks } = body

  validateTasks(tasks)

  const bot = new Bot()
  return await bot.deployBotTemplate(userId, {
    modelId: templateId,
    author,
    name,
    image,
    description,
    tasks,
  })
}
