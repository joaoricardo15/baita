import { DataType, getConnectorById } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

import Data from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

import { handleHealth } from './health'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const path = event.resource || ''

    let data: DataType | undefined

    if (path.endsWith('/health')) {
      data = (await handleHealth(event, userId)) as DataType
    } else {
      const method = event.httpMethod
      const connectionId = event.pathParameters?.connectionId

      if (connectionId) {
        switch (method) {
          case 'GET':
            data = await getConnectionDetails(userId, connectionId)
            break
          case 'DELETE': {
            const resource = new Data(userId, 'connection')

            // When deleting a connection, we need to remove any references to it from bots
            const connection = await resource.read(connectionId)
            if (!connection) throw new Error('Connection not found')

            const botResource = new Data(userId, 'bot')
            const bots = (await botResource.list()) || []
            for (const bot of bots) {
              const tasks = bot.tasks as Array<{
                connectionId?: string | number
              }>
              if (!tasks) continue
              const hasRef = tasks.some(
                (t) => String(t.connectionId) === String(connectionId)
              )
              if (hasRef) {
                const cleaned = tasks.map((t) =>
                  String(t.connectionId) === String(connectionId)
                    ? { ...t, connectionId: undefined }
                    : t
                )
                await botResource.update(bot.botId as string, {
                  tasks: cleaned,
                })
              }
            }

            await resource.delete(connectionId)
            break
          }
        }
      } else {
        switch (method) {
          case 'GET': {
            const resource = new Data(userId, 'connection')
            data = await resource.list()
            break
          }
          case 'POST': {
            const body = JSON.parse(event.body || '{}')
            data = await createConnection(userId, body)
            break
          }
        }
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}

async function createConnection(
  userId: string,
  body: { connectorId?: string; apiKey?: string }
) {
  const { connectorId, apiKey } = body

  if (!connectorId || !apiKey) {
    throw new Error('Missing required fields: connectorId, apiKey')
  }

  const connector = getConnectorById(connectorId)
  if (!connector || connector.auth.type !== 'userApiKey') {
    throw new Error('Invalid connector or auth type')
  }

  const newConnectionId = uuidv4()
  const newConnection = {
    userId,
    appId: connector.appId,
    connectionId: newConnectionId,
    connectorId,
    credentials: { apiKey },
    name: connector.name,
    email: '',
    createdAt: Date.now(),
  }

  const resource = new Data(userId, 'connection')
  await resource.create(newConnectionId, newConnection)

  return newConnection
}

async function getConnectionDetails(userId: string, connectionId: string) {
  const connectionResource = new Data(userId, 'connection')
  const connection = await connectionResource.read(connectionId)

  if (!connection) throw new Error('Connection not found')

  const botResource = new Data(userId, 'bot')
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

  return { connection: safeConnection, linkedBots }
}
