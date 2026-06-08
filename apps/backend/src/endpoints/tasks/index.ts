import { DataType, validateTasks } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Task from '@/controllers/task'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

interface IDirectInvocation {
  direct: true
  userId: string
  task: { service?: unknown; app?: unknown; connectionId?: string | number }
  resolvedInputData: DataType
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (
  event: APIGatewayProxyEvent | IDirectInvocation,
  context: Context,
  callback: Callback
): Promise<any> => {
  if ('direct' in event && event.direct) {
    const {
      userId,
      task: taskDef,
      resolvedInputData,
    } = event as IDirectInvocation
    const taskController = new Task()
    try {
      const result = await taskController.execute(
        userId,
        taskDef as Parameters<typeof taskController.execute>[1],
        resolvedInputData
      )
      return {
        success: result.status === 'success',
        data: result.outputData,
        message:
          result.status !== 'success'
            ? JSON.stringify(result.outputData)
            : undefined,
      }
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  const apiEvent = event as APIGatewayProxyEvent
  const api = new Api(apiEvent, context)
  const task = new Task()

  try {
    const userId = getAuthenticatedUserId(apiEvent)
    const body = JSON.parse(apiEvent.body || '{}')

    validateTasks([body])

    const data = await task.execute(userId, body)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, data)
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }

  return undefined
}
