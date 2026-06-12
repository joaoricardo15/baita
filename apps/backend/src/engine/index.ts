import {
  DataType,
  IBot,
  ITaskExecutionResult,
  TaskExecutionStatus,
} from '@baita/shared'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'

import { runBot } from './run'

interface IEngineEvent {
  botId: string
  userId: string
  payload?: DataType
}

export const handler = async (event: IEngineEvent) => {
  const { botId, userId, payload } = event

  if (!botId || !userId) {
    return { success: false, error: 'Missing botId or userId' }
  }

  const data = new Data(userId, 'bot')
  const bot = (await data.read(botId)) as IBot | undefined

  if (!bot) {
    return { success: false, error: 'Bot not found' }
  }

  if (!bot.active) {
    const sample: ITaskExecutionResult = {
      status: TaskExecutionStatus.success,
      inputData: payload ?? {},
      outputData: payload ?? {},
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
    payload: payload ?? {},
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
