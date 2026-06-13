import { useSyncExternalStore } from 'react'

import { getSnapshot, SaveStatus, subscribe } from './botSaveManager'

export function useBotSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribe, getSnapshot)
}
