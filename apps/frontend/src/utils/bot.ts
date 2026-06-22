import {
  computeRunUrl as computeRunUrlBase,
  computeTriggerToken,
} from '@baita/shared'

import appConfig from './config'

export function computeRunUrl(botId: string, userId: string): string {
  return computeRunUrlBase(botId, userId, appConfig.apiUrl)
}

export function computeIngestUrl(userId: string): string {
  const token = computeTriggerToken(userId)
  return `${appConfig.apiUrl}/location/ingest/${token}`
}
