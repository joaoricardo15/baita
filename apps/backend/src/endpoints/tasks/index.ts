import { validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import { execute } from '@/endpoints/task-execute'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'
import { getDataFromService } from '@/utils/bot'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
): Promise<void> => {
  const api = new Api(event, context)

  try {
    const userId = getAuthenticatedUserId(event)
    const task = JSON.parse(event.body || '{}')

    validateTasks([task])

    const inputData = getDataFromService(
      task.service?.config.inputFields || [],
      task.inputData || [],
      true
    )

    const result = await execute({ userId, task, resolvedInputData: inputData })

    if (!result.success) {
      console.warn('[tasks:http] Task failed', {
        userId,
        error: result.message,
      })
    }

    api.httpResponse(callback, ApiRequestStatus.success, undefined, {
      status: result.success ? 'success' : 'fail',
      inputData,
      outputData: result.success
        ? (result.data ?? null)
        : (result.message ?? null),
      timestamp: Date.now(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tasks:http] Unhandled error', { error: message })
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}
