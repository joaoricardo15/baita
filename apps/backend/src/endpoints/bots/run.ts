import { DataType, decodeTriggerToken } from '@baita/shared'
import { APIGatewayProxyEvent, Callback } from 'aws-lambda'

import Bot from '@/controllers/bot'

export async function handleRun(
  event: APIGatewayProxyEvent,
  callback: Callback
): Promise<void> {
  let success = true
  let message = ''

  try {
    const botId = event.pathParameters?.botId
    if (!botId) throw new Error('Missing botId')

    const token = event.pathParameters?.token
    if (!token) throw new Error('Missing token')

    const userId = decodeTriggerToken(token)
    const bot = new Bot()
    await bot.triggerBot(userId, botId, parseBody(event))
  } catch (err: unknown) {
    success = false
    message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  }

  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ success, message }),
  })
}

function parseBody(event: APIGatewayProxyEvent): DataType {
  if (!event.body) return {}

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString()
    : event.body

  try {
    return JSON.parse(raw) as DataType
  } catch {
    return raw as DataType
  }
}
