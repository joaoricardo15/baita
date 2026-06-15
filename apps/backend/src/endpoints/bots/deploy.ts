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

  const bot = new Bot()
  return await bot.deployBot(userId, botId, name, active, tasks)
}
