import { IBot } from '@baita/shared'
import { QueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

let pendingBotId: string | undefined
let pendingBot: Partial<IBot> | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let savedTimer: ReturnType<typeof setTimeout> | undefined
let status: SaveStatus = 'idle'
const listeners = new Set<() => void>()
let inflightPromise: Promise<void> | null = null

function notify() {
  listeners.forEach((fn) => fn())
}

function setStatus(next: SaveStatus) {
  if (status !== next) {
    status = next
    notify()
  }
}

async function executeSave(): Promise<void> {
  if (!pendingBotId || !pendingBot) return

  const botId = pendingBotId
  const bot = pendingBot
  pendingBotId = undefined
  pendingBot = undefined

  setStatus('saving')

  try {
    await mutations.updateBot(botId, bot)
    if (savedTimer) clearTimeout(savedTimer)
    setStatus('saved')
    savedTimer = setTimeout(() => setStatus('idle'), 2000)
  } catch {
    setStatus('error')
  }
}

export function save(
  botId: string,
  bot: Partial<IBot>,
  queryClient: QueryClient
) {
  const current = queryClient.getQueryData(['bot', botId])
  if (current === bot) return

  queryClient.setQueryData(['bot', botId], bot)
  pendingBotId = botId
  pendingBot = bot
  if (timer) clearTimeout(timer)
  if (savedTimer) clearTimeout(savedTimer)
  timer = setTimeout(() => {
    timer = undefined
    inflightPromise = executeSave().finally(() => {
      inflightPromise = null
    })
  }, 600)
}

export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = undefined
  }
  if (pendingBotId && pendingBot) {
    inflightPromise = executeSave().finally(() => {
      inflightPromise = null
    })
  }
  if (inflightPromise) {
    await inflightPromise
  }
}

export function getStatus(): SaveStatus {
  return status
}

export function getSnapshot(): SaveStatus {
  return status
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function reset() {
  if (timer) clearTimeout(timer)
  if (savedTimer) clearTimeout(savedTimer)
  timer = undefined
  savedTimer = undefined
  pendingBotId = undefined
  pendingBot = undefined
  inflightPromise = null
  setStatus('idle')
}
