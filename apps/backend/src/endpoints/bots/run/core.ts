import {
  DataType,
  decodeTriggerToken,
  IBot,
  ITaskExecutionResult,
  TaskExecutionStatus,
} from '@baita/shared'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import { runBot } from '@/engine'

export interface IRunParams {
  userId: string
  botId: string
  payload: DataType
}

export interface IRunResult {
  success: boolean
  data?: DataType
  message?: string
}

export { decodeTriggerToken }

export async function run(params: IRunParams): Promise<IRunResult> {
  const { userId, botId, payload } = params

  const data = new Data(userId, 'bot')
  const bot = (await data.read(botId)) as IBot | undefined

  if (!bot) {
    throw new Error('Bot not found')
  }

  if (!bot.active) {
    const sample: ITaskExecutionResult = {
      status: TaskExecutionStatus.success,
      inputData: payload,
      outputData: payload,
      timestamp: Date.now(),
    }
    const botController = new Bot()
    await botController.addTriggerSample(userId, botId, sample)
    return { success: true, message: 'Trigger sample stored' }
  }

  const result = await runBot({
    userId,
    botId,
    tasks: bot.tasks,
    triggerPayload: payload,
  })

  console.info(
    JSON.stringify({
      logs: result.logs,
      usage: result.usage,
      botId,
      userId,
      timestamp: Date.now(),
    })
  )

  return { success: result.success, data: result.data }
}
