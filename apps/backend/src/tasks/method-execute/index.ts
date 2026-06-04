import {
  DataType,
  ITaskExecutionInput,
  MethodName,
  TaskExecutionStatus,
  validateTaskExecutionInput,
} from '@baita/shared'
import { Callback, Context } from 'aws-lambda'

import Api from '@/utils/api'

import { httpRequest, oauth2Request } from './methods/http'
import { sendNotification } from './methods/push'
import { getTodo, publishToFeed } from './methods/user'

const METHODS: Record<
  MethodName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (input: ITaskExecutionInput<any>) => unknown
> = {
  getTodo,
  publishToFeed,
  sendNotification,
  httpRequest,
  oauth2Request,
}

export const handler = async (
  event: ITaskExecutionInput<DataType>,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    validateTaskExecutionInput(event)

    const { serviceConfig } = event

    const methodName = serviceConfig.methodName as MethodName
    const method = METHODS[methodName]

    if (!method) {
      throw new Error(`Unknown method: ${methodName}`)
    }

    const data = (await method(event)) as DataType | undefined

    api.taskExecutionResponse(
      callback,
      TaskExecutionStatus.success,
      undefined,
      data
    )
  } catch (err: unknown) {
    api.taskExecutionResponse(callback, TaskExecutionStatus.fail, err)
  }
}
