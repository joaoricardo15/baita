import { computeRunUrl as computeRunUrlBase } from '@baita/shared'

import appConfig from './config'

export function computeRunUrl(botId: string, userId: string): string {
  return computeRunUrlBase(botId, userId, appConfig.apiUrl)
}
