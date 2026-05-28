import { Callback, Context } from 'aws-lambda'
import {
  ITaskExecutionInput,
  TaskExecutionStatus,
} from 'src/models/bot/interface'
import { validateTaskExecutionInput } from 'src/models/bot/schema'
import { DataType } from 'src/models/service/interface'
import Api from 'src/utils/api'
import { CODE_EXECUTION_TIMEOUT_MS } from 'src/utils/constants'
import vm from 'vm'

interface ICodeExecute {
  code: string
  [key: string]: DataType
}

exports.handler = async (
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
