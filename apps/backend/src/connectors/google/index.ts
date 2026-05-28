import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'
import Bot from 'src/controllers/bot'
import Resource from 'src/controllers/resource'
import { validateAppConnection } from 'src/models/app/schema'
import Api, { ApiRequestStatus } from 'src/utils/api'

import Google from './google'

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const bot = new Bot()
  const google = new Google()

  try {
    const { code, state, error } = event.queryStringParameters || {}

    if (error) {
      return api.httpConnectorResponse(callback, ApiRequestStatus.fail)
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    const { userId, appId, botId, taskIndex } =
      google.deconstructAuthState(state)

    const credentials = await google.getCredentials(code)

    const { connectionId, email } = await google.getConnectionInfo(
      credentials.access_token
    )

    const newConnection = {
      userId,
      appId,
      connectionId,
      credentials,
      name: email,
      email,
    }

    validateAppConnection(newConnection)

    const resource = new Resource(userId, 'connection')

    await resource.create(connectionId, newConnection)

    await bot.addConnection(userId, botId, connectionId, taskIndex)

    api.httpConnectorResponse(callback, ApiRequestStatus.success)
  } catch (err: unknown) {
    api.httpConnectorResponse(callback, ApiRequestStatus.fail, err)
  }
}
