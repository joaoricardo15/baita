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
      const templateId = event.pathParameters?.templateId
      const resource = new Data(SYSTEM_USER, 'template')

      if (templateId) {
        switch (method) {
          case 'GET':
            data = await resource.read(templateId)
            break
          case 'PUT': {
            const body = JSON.parse(event.body || '{}')
            resource.validate(body)
            await resource.create(templateId, body)
            data = body
            break
          }
          case 'DELETE':
            await resource.delete(templateId)
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
