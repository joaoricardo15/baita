import {
  DataType,
  ITaskExecutionInput,
  ITaskExecutionResult,
  TaskExecutionStatus,
  validateTaskExecutionResult,
} from '@baita/shared'

import Bot from '@/controllers/bot'

import { executeCode } from './code'
import { executeMethod } from './methods'

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

  if (!serviceName) {
    throw new Error(
      'serviceName is required — task.service.name must be defined'
    )
  }

  switch (serviceName) {
    case 'code-execute':
      return executeCode(input)
    case 'method-execute':
      return executeMethod(input)
    case 'trigger-sample':
      return executeTriggerSample(input)
    default:
      throw new Error(`Unknown service: ${serviceName}`)
  }
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
