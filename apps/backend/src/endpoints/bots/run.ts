import { DataType, decodeTriggerToken } from '@baita/shared'
import { APIGatewayProxyEvent, Callback } from 'aws-lambda'

import Bot from '@/controllers/bot'
import Api, { ApiRequestStatus } from '@/utils/api'

export async function handleRun(
  event: APIGatewayProxyEvent,
  api: Api,
  callback: Callback
): Promise<void> {
  try {
    const botId = event.pathParameters?.botId
    if (!botId) throw new Error('Missing botId')

    const token = event.pathParameters?.token
    if (!token) throw new Error('Missing token')

    const userId = decodeTriggerToken(token)
    const bot = new Bot()
    await bot.triggerBot(userId, botId, parseBody(event))

    api.httpResponse(callback, ApiRequestStatus.success)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
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
