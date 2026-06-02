import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Resource, {
  resourceOperations,
  resourceValidationProneOperations,
  resourceValidations,
} from '@/controllers/resource'
import Api, { ApiRequestStatus } from '@/utils/api'

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const { userId, resourceName, operation, resourceId } =
      event.pathParameters || {}

    if (!userId || !resourceName || !operation) {
      throw new Error('Missing required path parameters')
    }

    const resource = new Resource(userId, resourceName)

    const body = JSON.parse(event.body || '{}')

    if (!resourceOperations.includes(operation)) {
      throw new Error('Operation not supported')
    }

    if (
      resourceValidationProneOperations.includes(operation) &&
      Object.keys(resourceValidations).includes(resourceName)
    ) {
      resourceValidations[resourceName](body)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resourceAny = resource as any

    if (typeof resourceAny[operation] !== 'function') {
      throw new Error('Operation not available')
    }

    const data = await resourceAny[operation](resourceId, body)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
