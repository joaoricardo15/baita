import { APIGatewayProxyEvent } from 'aws-lambda'

import Bot from '@/controllers/bot'

export async function handleTest(
  event: APIGatewayProxyEvent,
  userId: string
): Promise<unknown> {
  const botId = event.pathParameters?.botId
  if (!botId) throw new Error('Missing botId')

  const body = JSON.parse(event.body || '{}')
  const { task, taskIndex } = body

  if (taskIndex === undefined) throw new Error('Missing taskIndex')

  const bot = new Bot()
  return await bot.testBot(userId, botId, task, String(taskIndex))
}
