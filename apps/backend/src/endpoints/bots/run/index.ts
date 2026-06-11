import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import { handleHttp } from './http'
import { handleScheduled } from './scheduled'

export const handler = async (
  event: APIGatewayProxyEvent | { botId: string; token: string },
  context: Context,
  callback: Callback
) => {
  const isHttp = 'httpMethod' in event

  if (isHttp) {
    return handleHttp(event as APIGatewayProxyEvent, context, callback)
  }

  return handleScheduled(event as { botId: string; token: string })
}
