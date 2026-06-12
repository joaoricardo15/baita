import { APIGatewayProxyEvent } from 'aws-lambda'

import Bot from '@/controllers/bot'

export async function handleLogs(
  event: APIGatewayProxyEvent
): Promise<unknown> {
  const botId = event.pathParameters?.botId
  if (!botId) throw new Error('Missing botId')

  const body = JSON.parse(event.body || '{}')
  const bot = new Bot()
  return await bot.getBotLogs(botId, body.searchTerms)
}
