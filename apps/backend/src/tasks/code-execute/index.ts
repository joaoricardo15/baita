import {
  DataType,
  ITaskExecutionInput,
  TaskExecutionStatus,
  validateTaskExecutionInput,
} from '@baita/shared'
import { Callback, Context } from 'aws-lambda'
import vm from 'vm'

import Api from '@/utils/api'
import { CODE_EXECUTION_TIMEOUT_MS } from '@/utils/constants'

interface ICodeExecute {
  code: string
  [key: string]: DataType
}

export const handler = async (
  event: ITaskExecutionInput<ICodeExecute>,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    validateTaskExecutionInput(event)

    const { userId, botId, inputData } =
      event as ITaskExecutionInput<ICodeExecute>

    const { code, ...customFields } = inputData

    const codeContext = { ...customFields, userId, botId, output: undefined }

    vm.createContext(codeContext)

    vm.runInContext(code, codeContext, {
      displayErrors: true,
      timeout: CODE_EXECUTION_TIMEOUT_MS,
    })

    api.taskExecutionResponse(
      callback,
      TaskExecutionStatus.success,
      undefined,
      codeContext.output
    )
  } catch (err: unknown) {
    api.taskExecutionResponse(callback, TaskExecutionStatus.fail, err)
  }
}
