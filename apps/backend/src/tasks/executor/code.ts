import { DataType, ITaskExecutionInput } from '@baita/shared'
import vm from 'vm'

import { CODE_EXECUTION_TIMEOUT_MS } from '@/utils/constants'

export async function executeCode(
  input: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { userId, botId, inputData } = input
  const { code, ...customFields } = inputData as Record<string, DataType>

  const codeContext = { ...customFields, userId, botId, output: undefined }

  vm.createContext(codeContext)

  vm.runInContext(code as string, codeContext, {
    displayErrors: true,
    timeout: CODE_EXECUTION_TIMEOUT_MS,
  })

  return codeContext.output
}
