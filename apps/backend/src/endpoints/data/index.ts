import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Data, { dataValidations } from '@/controllers/data'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const { type, id, fileId } = event.pathParameters || {}
    const method = event.httpMethod
    const path = event.resource || ''

    if (!type) {
      throw new Error('Missing data type')
    }

    const store = new Data(userId, type)
    const body = JSON.parse(event.body || '{}')

    let data

    if (path.endsWith('/upload')) {
      if (!id) throw new Error('Missing record id')
      data = await store.upload(id)
    } else if (path.endsWith('/files/{fileId}') && method === 'DELETE') {
      if (!fileId) throw new Error('Missing fileId')
      await store.remove(fileId)
    } else if (id) {
      switch (method) {
        case 'GET':
          data = await store.read(id)
          break
        case 'PUT':
          if (Object.keys(dataValidations).includes(type)) {
            dataValidations[type](body)
          }
          await store.create(id, body)
          data = body
          break
        case 'PATCH':
          if (Object.keys(dataValidations).includes(type)) {
            dataValidations[type](body)
          }
          data = await store.update(id, body)
          break
        case 'DELETE':
          await store.delete(id)
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    } else {
      switch (method) {
        case 'GET':
          data = await store.list()
          break
        case 'PUT':
          if (Object.keys(dataValidations).includes(type)) {
            dataValidations[type](body)
          }
          await store.create('', body)
          data = body
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
