import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Data from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

import { handleDeploy } from './deploy'

const SYSTEM_USER = 'baita'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const path = event.resource || ''

    let data

    if (path.endsWith('/deploy')) {
      data = await handleDeploy(event, userId)
    } else {
      const method = event.httpMethod
      const modelId = event.pathParameters?.modelId
      const resource = new Data(SYSTEM_USER, 'model')

      if (modelId) {
        switch (method) {
          case 'GET':
            data = await resource.read(modelId)
            break
          case 'PUT': {
            const body = JSON.parse(event.body || '{}')
            resource.validate(body)
            await resource.create(modelId, body)
            data = body
            break
          }
          case 'DELETE':
            await resource.delete(modelId)
            break
        }
      } else {
        switch (method) {
          case 'GET':
            data = await resource.list()
            break
        }
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
