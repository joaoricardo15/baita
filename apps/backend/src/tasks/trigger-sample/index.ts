import { ITaskExecutionInput, TaskExecutionStatus } from '@baita/shared'
import {
  validateTaskExecutionInput,
  validateTaskExecutionResult,
} from '@baita/shared'
import { DataType } from '@baita/shared'
import { Callback, Context } from 'aws-lambda'
import Bot from '@/controllers/bot'
import Api from '@/utils/api'

interface ITriggerSample {
  status: TaskExecutionStatus
  inputData: DataType
  outputData: DataType
}

exports.handler = async (
  event: ITaskExecutionInput<ITriggerSample>,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)
  const bot = new Bot()

  try {
    validateTaskExecutionInput(event)

    const { userId, botId, inputData } =
      event as ITaskExecutionInput<ITriggerSample>

    const sample = {
      status: inputData.status,
      inputData: inputData.inputData,
      outputData: inputData.outputData,
      timestamp: Date.now(),
    }

    validateTaskExecutionResult(sample)

    await bot.addTriggerSample(userId, botId, sample)

    api.taskExecutionResponse(
      callback,
      TaskExecutionStatus.success,
      undefined,
      sample
    )
  } catch (err: unknown) {
    api.taskExecutionResponse(callback, TaskExecutionStatus.fail, err)
  }
}
