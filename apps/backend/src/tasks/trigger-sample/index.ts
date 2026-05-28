import { Callback, Context } from 'aws-lambda'
import Bot from 'src/controllers/bot'
import {
  ITaskExecutionInput,
  TaskExecutionStatus,
} from 'src/models/bot/interface'
import {
  validateTaskExecutionInput,
  validateTaskExecutionResult,
} from 'src/models/bot/schema'
import { DataType } from 'src/models/service/interface'
import Api from 'src/utils/api'

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
