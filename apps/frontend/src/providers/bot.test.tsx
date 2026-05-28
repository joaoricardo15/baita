import { act, renderHook } from '@testing-library/react'
import { FC, ReactNode, useContext } from 'react'
import { vi } from 'vitest'

import { AuthContext } from './auth'
import BotProvider, { BotContext } from './bot'

vi.mock('../utils/push', () => ({
  getExistingSubscription: vi.fn().mockResolvedValue(null),
}))

const mockRequest = vi.fn()
const mockInterceptorUse = vi.fn()

vi.mock('axios', () => ({
  default: {
    create: () => ({
      request: mockRequest,
      interceptors: {
        request: { use: mockInterceptorUse },
        response: { use: vi.fn() },
      },
    }),
  },
}))

const mockAuthValue = {
  user: {
    userId: 'test-user',
    email: 'test@test.com',
    name: 'Test',
    picture: '',
  },
  isLoading: false,
  error: undefined,
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
  getToken: vi.fn().mockResolvedValue('token'),
}

const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={mockAuthValue}>
    <BotProvider>{children}</BotProvider>
  </AuthContext.Provider>
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BotProvider', () => {
  describe('getBots', () => {
    it('updates bots state from API response', async () => {
      mockRequest.mockResolvedValue({
        data: {
          success: true,
          data: [
            { botId: 'bot-1', name: 'Bot 1', tasks: [] },
            { botId: 'bot-2', name: 'Bot 2', tasks: [] },
          ],
        },
      })

      const { result } = renderHook(() => useContext(BotContext), { wrapper })

      expect(result.current.bots).toBeUndefined()

      await act(async () => {
        await result.current.getBots()
      })

      expect(result.current.bots).toHaveLength(2)
      expect(result.current.bots![0].botId).toBe('bot-1')
    })
  })

  describe('createBot', () => {
    it('creates bot and returns botId', async () => {
      mockRequest.mockResolvedValue({
        data: {
          success: true,
          data: {
            botId: 'new-bot-123',
            userId: 'test-user',
            tasks: [],
            active: false,
          },
        },
      })

      const { result } = renderHook(() => useContext(BotContext), { wrapper })

      let botId: string
      await act(async () => {
        botId = await result.current.createBot()
      })

      expect(botId!).toBe('new-bot-123')
      expect(result.current.bot).toEqual({
        botId: 'new-bot-123',
        userId: 'test-user',
        tasks: [],
        active: false,
      })
    })
  })

  describe('deleteBot', () => {
    it('removes bot from state optimistically', async () => {
      mockRequest
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: [
              { botId: 'bot-1', name: 'Bot 1', tasks: [] },
              { botId: 'bot-2', name: 'Bot 2', tasks: [] },
            ],
          },
        })
        .mockResolvedValue({ data: { success: true, data: null } })

      const { result } = renderHook(() => useContext(BotContext), { wrapper })

      await act(async () => {
        await result.current.getBots()
      })

      expect(result.current.bots).toHaveLength(2)

      await act(async () => {
        await result.current.deleteBot('bot-1', 'api-1')
      })

      expect(result.current.bots).toHaveLength(1)
      expect(result.current.bots![0].botId).toBe('bot-2')
    })
  })

  describe('getBot', () => {
    it('sets single bot state', async () => {
      mockRequest.mockResolvedValue({
        data: {
          success: true,
          data: { botId: 'bot-1', name: 'My Bot', tasks: [], active: true },
        },
      })

      const { result } = renderHook(() => useContext(BotContext), { wrapper })

      await act(async () => {
        await result.current.getBot('bot-1')
      })

      expect(result.current.bot).toEqual({
        botId: 'bot-1',
        name: 'My Bot',
        tasks: [],
        active: true,
      })
    })
  })

  describe('getBotModels', () => {
    it('updates botModels state', async () => {
      mockRequest.mockResolvedValue({
        data: {
          success: true,
          data: [{ modelId: 'm-1', name: 'Template 1', tasks: [] }],
        },
      })

      const { result } = renderHook(() => useContext(BotContext), { wrapper })

      expect(result.current.botModels).toBeUndefined()

      await act(async () => {
        await result.current.getBotModels()
      })

      expect(result.current.botModels).toHaveLength(1)
      expect(result.current.botModels![0].modelId).toBe('m-1')
    })
  })

  describe('getBotInputs', () => {
    it('returns empty array for tasks with no sample results', () => {
      const { result } = renderHook(() => useContext(BotContext), { wrapper })

      const inputs = result.current.getBotInputs([
        { taskId: 1, inputData: [] } as any,
      ])

      expect(inputs).toEqual([])
    })

    it('extracts variables from task sample output data', () => {
      const { result } = renderHook(() => useContext(BotContext), { wrapper })

      const inputs = result.current.getBotInputs([
        {
          taskId: 1,
          inputData: [],
          sampleResult: {
            outputData: { title: 'Hello', count: 5 },
            status: 'success',
            timestamp: 1000,
          },
        } as any,
      ])

      expect(inputs.length).toBeGreaterThan(0)
      expect(inputs.some((i) => i.name === 'title')).toBe(true)
      expect(inputs.some((i) => i.name === 'count')).toBe(true)
    })
  })
})
