import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Data, {
  dataValidationProneOperations,
  dataValidations,
} from '@/controllers/data'
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

    const resource = new Data(userId, type)
    const body = JSON.parse(event.body || '{}')

    let data
    let operation: string

    if (path.endsWith('/upload')) {
      operation = 'upload'
      if (!id) throw new Error('Missing record id')
      data = await resource.upload(id)
    } else if (path.endsWith('/files/{fileId}') && method === 'DELETE') {
      operation = 'remove'
      if (!fileId) throw new Error('Missing fileId')
      await resource.remove(fileId)
    } else if (id) {
      switch (method) {
        case 'GET':
          operation = 'read'
          data = await resource.read(id)
          break
        case 'POST':
          operation = 'create'
          if (
            dataValidationProneOperations.includes(operation) &&
            Object.keys(dataValidations).includes(type)
          ) {
            dataValidations[type](body)
          }
          await resource.create(id, body)
          data = body
          break
        case 'PATCH':
          operation = 'update'
          if (
            dataValidationProneOperations.includes(operation) &&
            Object.keys(dataValidations).includes(type)
          ) {
            dataValidations[type](body)
          }
          data = await resource.update(id, body)
          break
        case 'DELETE':
          operation = 'delete'
          await resource.delete(id)
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    } else {
      switch (method) {
        case 'GET':
          operation = 'list'
          data = await resource.list()
          break
        case 'POST': {
          operation = 'create'
          const resourceId = body.id || body[`${type}Id`] || ''
          if (
            dataValidationProneOperations.includes(operation) &&
            Object.keys(dataValidations).includes(type)
          ) {
            dataValidations[type](body)
          }
          await resource.create(resourceId, body)
          data = body
          break
        }
        case 'PATCH': {
          operation = 'update'
          if (
            dataValidationProneOperations.includes(operation) &&
            Object.keys(dataValidations).includes(type)
          ) {
            dataValidations[type](body)
          }
          data = await resource.update('', body)
          break
        }
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
