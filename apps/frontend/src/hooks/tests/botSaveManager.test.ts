import { IBot } from '@baita/shared'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  flush,
  getStatus,
  reset,
  save,
  subscribe,
} from '@/utils/botSaveManager'

vi.mock('@/api/mutations', () => ({
  updateBot: vi.fn(),
}))

import * as mutations from '@/api/mutations'

const mockUpdateBot = vi.mocked(mutations.updateBot)

function createMockBot(overrides: Partial<IBot> = {}): IBot {
  return {
    botId: 'bot-1',
    name: 'Test Bot',
    active: false,
    tasks: [],
    triggerSamples: [],
    ...overrides,
  } as IBot
}

describe('botSaveManager', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.useFakeTimers()
    queryClient = new QueryClient()
    mockUpdateBot.mockResolvedValue(createMockBot())
    reset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('save()', () => {
    it('updates query cache immediately', () => {
      const bot = createMockBot({ name: 'Updated' })
      save('bot-1', bot, queryClient)

      expect(queryClient.getQueryData(['bot', 'bot-1'])).toEqual(bot)
    })

    it('does not call API immediately', () => {
      save('bot-1', createMockBot(), queryClient)

      expect(mockUpdateBot).not.toHaveBeenCalled()
    })

    it('calls API after 600ms debounce', async () => {
      const bot = createMockBot({ name: 'Updated' })
      save('bot-1', bot, queryClient)

      vi.advanceTimersByTime(600)
      await vi.runAllTimersAsync()

      expect(mockUpdateBot).toHaveBeenCalledWith('bot-1', bot)
    })

    it('only sends the latest bot when called multiple times within 600ms', async () => {
      const bot1 = createMockBot({ name: 'First' })
      const bot2 = createMockBot({ name: 'Second' })
      const bot3 = createMockBot({ name: 'Third' })

      save('bot-1', bot1, queryClient)
      save('bot-1', bot2, queryClient)
      save('bot-1', bot3, queryClient)

      vi.advanceTimersByTime(600)
      await vi.runAllTimersAsync()

      expect(mockUpdateBot).toHaveBeenCalledTimes(1)
      expect(mockUpdateBot).toHaveBeenCalledWith('bot-1', bot3)
    })

    it('resets debounce timer on each call', async () => {
      save('bot-1', createMockBot({ name: 'First' }), queryClient)

      vi.advanceTimersByTime(500)
      expect(mockUpdateBot).not.toHaveBeenCalled()

      save('bot-1', createMockBot({ name: 'Second' }), queryClient)

      vi.advanceTimersByTime(500)
      expect(mockUpdateBot).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()

      expect(mockUpdateBot).toHaveBeenCalledTimes(1)
      expect(mockUpdateBot).toHaveBeenCalledWith(
        'bot-1',
        expect.objectContaining({ name: 'Second' })
      )
    })
  })

  describe('flush()', () => {
    it('immediately sends pending data', async () => {
      const bot = createMockBot({ name: 'Flushed' })
      save('bot-1', bot, queryClient)

      await flush()

      expect(mockUpdateBot).toHaveBeenCalledWith('bot-1', bot)
    })

    it('resolves immediately when nothing is pending', async () => {
      await expect(flush()).resolves.toBeUndefined()
      expect(mockUpdateBot).not.toHaveBeenCalled()
    })

    it('awaits in-flight request', async () => {
      let resolveUpdate: () => void
      mockUpdateBot.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = () => resolve(createMockBot())
          })
      )

      save('bot-1', createMockBot(), queryClient)
      vi.advanceTimersByTime(600)

      const flushPromise = flush()
      let resolved = false
      flushPromise.then(() => {
        resolved = true
      })

      await vi.advanceTimersByTimeAsync(0)
      expect(resolved).toBe(false)

      resolveUpdate!()
      await flushPromise

      expect(resolved).toBe(true)
    })
  })

  describe('status transitions', () => {
    it('starts as idle', () => {
      expect(getStatus()).toBe('idle')
    })

    it('transitions to saving during API call', async () => {
      let resolveUpdate: () => void
      mockUpdateBot.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = () => resolve(createMockBot())
          })
      )

      save('bot-1', createMockBot(), queryClient)
      vi.advanceTimersByTime(600)
      await vi.advanceTimersByTimeAsync(0)

      expect(getStatus()).toBe('saving')

      resolveUpdate!()
      await vi.advanceTimersByTimeAsync(0)

      expect(getStatus()).toBe('saved')
    })

    it('transitions to error on API failure', async () => {
      mockUpdateBot.mockRejectedValueOnce(new Error('Network error'))

      save('bot-1', createMockBot(), queryClient)
      await flush()

      expect(getStatus()).toBe('error')
    })

    it('transitions from saved back to idle after 2 seconds', async () => {
      save('bot-1', createMockBot(), queryClient)
      await flush()

      expect(getStatus()).toBe('saved')

      vi.advanceTimersByTime(2000)

      expect(getStatus()).toBe('idle')
    })
  })

  describe('subscribe()', () => {
    it('notifies listeners on status change', async () => {
      const listener = vi.fn()
      subscribe(listener)

      save('bot-1', createMockBot(), queryClient)
      await flush()

      expect(listener).toHaveBeenCalled()
    })

    it('returns unsubscribe function', async () => {
      const listener = vi.fn()
      const unsubscribe = subscribe(listener)

      unsubscribe()

      save('bot-1', createMockBot(), queryClient)
      await flush()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('reset()', () => {
    it('clears pending data without sending', async () => {
      save('bot-1', createMockBot(), queryClient)
      reset()

      vi.advanceTimersByTime(600)
      await vi.runAllTimersAsync()

      expect(mockUpdateBot).not.toHaveBeenCalled()
    })

    it('resets status to idle', async () => {
      mockUpdateBot.mockRejectedValueOnce(new Error('fail'))
      save('bot-1', createMockBot(), queryClient)
      await flush()

      expect(getStatus()).toBe('error')

      reset()

      expect(getStatus()).toBe('idle')
    })
  })
})
