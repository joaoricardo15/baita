import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Data from '@/controllers/data'
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

    if (!type) {
      throw new Error('Missing data type')
    }

    const method = event.httpMethod
    const path = event.resource || ''
    const body = JSON.parse(event.body || '{}')

    const store = new Data(userId, type)
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
          store.validate(body)
          await store.create(id, body)
          data = body
          break
        case 'PATCH':
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
        case 'GET': {
          const singleton = await store.read()
          data = singleton ?? (await store.list())
          break
        }
        case 'PUT':
          store.validate(body)
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
