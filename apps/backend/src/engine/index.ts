import { DataType, IBot } from '@baita/shared'

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
    return { success: true, message: 'Bot is inactive — skipping execution' }
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
