import {
  DataType,
  ITaskExecutionInput,
  ITaskExecutionResult,
  TaskExecutionStatus,
  validateTaskExecutionResult,
} from '@baita/shared'

import Bot from '@/controllers/bot'

import { executeCode } from './executor/code'
import { executeMethod } from './executor/methods'

export interface IExecuteTaskParams {
  botId: string
  userId: string
  connectionId?: string | number
  appConfig: DataType
  serviceConfig: DataType
  inputData: DataType
  serviceName?: string
}

export async function executeTask(
  params: IExecuteTaskParams
): Promise<DataType | undefined> {
  const { serviceName, ...rest } = params
  const input = rest as ITaskExecutionInput<DataType>
  const resolvedName = serviceName || inferServiceName(input)

  switch (resolvedName) {
    case 'code-execute':
      return executeCode(input)
    case 'method-execute':
      return executeMethod(input)
    case 'trigger-sample':
      return executeTriggerSample(input)
    default:
      throw new Error(`Unknown service: ${resolvedName}`)
  }
}

function inferServiceName(input: ITaskExecutionInput<DataType>): string {
  if ((input.serviceConfig as Record<string, unknown>)?.methodName)
    return 'method-execute'
  if ((input.inputData as Record<string, unknown>)?.code !== undefined)
    return 'code-execute'
  return 'unknown'
}

async function executeTriggerSample(
  input: ITaskExecutionInput<DataType>
): Promise<DataType | undefined> {
  const { userId, inputData } = input
  const {
    inputData: sampleInput,
    outputData,
    status,
    botId,
  } = inputData as Record<string, DataType>

  const sample: ITaskExecutionResult = {
    status: status as TaskExecutionStatus,
    inputData: sampleInput,
    outputData: outputData ?? null,
    timestamp: Date.now(),
  }

  validateTaskExecutionResult(sample)

  const bot = new Bot()
  await bot.addTriggerSample(userId, botId as string, sample)

  return sample as unknown as DataType
}
