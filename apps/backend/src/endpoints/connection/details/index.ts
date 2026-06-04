import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Resource from '@/controllers/resource'
import Api, { ApiRequestStatus } from '@/utils/api'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const { userId, connectionId } = event.pathParameters || {}

    if (!userId || !connectionId) {
      throw new Error('Missing userId or connectionId')
    }

    const connectionResource = new Resource(userId, 'connection')
    const connection = await connectionResource.read(connectionId)

    if (!connection) {
      throw new Error('Connection not found')
    }

    const botResource = new Resource(userId, 'bot')
    const bots = (await botResource.list()) || []

    const linkedBots = bots
      .filter((bot: Record<string, unknown>) => {
        const tasks = bot.tasks as Array<{ connectionId?: string | number }>
        return tasks?.some(
          (task) => String(task.connectionId) === String(connectionId)
        )
      })
      .map((bot: Record<string, unknown>) => ({
        botId: bot.botId,
        name: bot.name,
      }))

    const { credentials: _creds, ...safeConnection } = connection

    api.httpResponse(callback, ApiRequestStatus.success, undefined, {
      connection: safeConnection,
      linkedBots,
    })
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
