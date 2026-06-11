import { decodeTriggerToken } from '@baita/shared'

import { IRunResult, run } from './core'

interface ISchedulerEvent {
  botId: string
  token: string
}

export async function handleScheduled(
  event: ISchedulerEvent
): Promise<IRunResult> {
  const { botId, token } = event

  if (!botId || !token) {
    throw new Error('Missing botId or token in scheduler payload')
  }

  const userId = decodeTriggerToken(token)

  return run({ userId, botId, payload: {} })
}
