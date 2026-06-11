import { DataType } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Api, { ApiRequestStatus } from '@/utils/api'

import { decodeTriggerToken, run } from './core'

export async function handleHttp(
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  const api = new Api(event, context)

  try {
    const botId = event.pathParameters?.botId
    const token = event.pathParameters?.token

    if (!botId || !token) {
      throw new Error('Missing botId or token')
    }

    const userId = decodeTriggerToken(token)
    const payload = parseBody(event)

    const result = await run({ userId, botId, payload })

    api.httpResponse(callback, ApiRequestStatus.success, undefined, result)
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
