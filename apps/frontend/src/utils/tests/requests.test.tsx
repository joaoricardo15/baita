import { renderHook } from '@testing-library/react'
import Axios from 'axios'
import { ReactNode } from 'react'
import { vi } from 'vitest'

import { AuthContext } from '@/providers/auth'
import ApiRequest from '@/utils/requests'

vi.mock('axios')

const mockRequest = vi.fn()
const mockInterceptorUse = vi.fn()

vi.mocked(Axios.create).mockReturnValue({
  request: mockRequest,
  interceptors: {
    request: { use: mockInterceptorUse },
    response: { use: vi.fn() },
  },
} as any)

const mockGetToken = vi.fn().mockResolvedValue('test-token-123')
const mockUser = {
  userId: 'user-1',
  email: 'test@test.com',
  name: 'Test',
  picture: '',
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider
    value={{
      user: mockUser,
      getToken: mockGetToken,
      isLoading: false,
      error: undefined,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    }}
  >
    {children}
  </AuthContext.Provider>
)

beforeEach(() => {
  vi.clearAllMocks()
  mockRequest.mockResolvedValue({
    data: { success: true, data: [] },
  })
  vi.mocked(Axios.create).mockReturnValue({
    request: mockRequest,
    interceptors: {
      request: { use: mockInterceptorUse },
      response: { use: vi.fn() },
    },
  } as any)
})

describe('ApiRequest', () => {
  describe('initialization', () => {
    it('creates Axios client with correct baseURL and headers', () => {
      renderHook(() => ApiRequest(), { wrapper })

      expect(Axios.create).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
    })

    it('registers a request interceptor for auth token', () => {
      renderHook(() => ApiRequest(), { wrapper })

      expect(mockInterceptorUse).toHaveBeenCalledTimes(1)
      expect(mockInterceptorUse).toHaveBeenCalledWith(expect.any(Function))
    })

    it('interceptor injects Bearer token into headers', async () => {
      renderHook(() => ApiRequest(), { wrapper })

      const interceptorFn = mockInterceptorUse.mock.calls[0][0]
      const config = { headers: {} as any }
      const result = await interceptorFn(config)

      expect(mockGetToken).toHaveBeenCalled()
      expect(result.headers.Authorization).toBe('Bearer test-token-123')
    })
  })

  describe('getBots', () => {
    it('sends POST request to resource/bot/list', async () => {
      const { result } = renderHook(() => ApiRequest(), { wrapper })

      await result.current.getBots()

      expect(mockRequest).toHaveBeenCalledWith({
        url: 'user/user-1/resource/bot/list',
        method: 'post',
        data: undefined,
      })
    })
  })

  describe('createBot', () => {
    it('sends POST request to bot endpoint', async () => {
      mockRequest.mockResolvedValue({
        data: { success: true, data: { botId: 'new-bot' } },
      })

      const { result } = renderHook(() => ApiRequest(), { wrapper })
      const bot = await result.current.createBot()

      expect(mockRequest).toHaveBeenCalledWith({
        url: 'user/user-1/bot',
        method: 'post',
        data: undefined,
      })
      expect(bot).toEqual({ botId: 'new-bot' })
    })
  })

  describe('updateBot', () => {
    it('sends PUT request with bot data', async () => {
      mockRequest.mockResolvedValue({
        data: { success: true, data: { botId: 'bot-1', name: 'Updated' } },
      })

      const { result } = renderHook(() => ApiRequest(), { wrapper })
      await result.current.updateBot('bot-1', { name: 'Updated' })

      expect(mockRequest).toHaveBeenCalledWith({
        url: 'user/user-1/bot/bot-1',
        method: 'put',
        data: { name: 'Updated' },
      })
    })
  })

  describe('deleteBot', () => {
    it('sends DELETE request with botId and apiId', async () => {
      mockRequest.mockResolvedValue({ data: { success: true, data: null } })

      const { result } = renderHook(() => ApiRequest(), { wrapper })
      await result.current.deleteBot('bot-1', 'api-1')

      expect(mockRequest).toHaveBeenCalledWith({
        url: 'user/user-1/bot/bot-1/api/api-1',
        method: 'delete',
        data: undefined,
      })
    })
  })

  describe('getNotes', () => {
    it('sends POST request to resource/note/list', async () => {
      mockRequest.mockResolvedValue({
        data: { success: true, data: [{ noteId: 'n1', title: 'Note' }] },
      })

      const { result } = renderHook(() => ApiRequest(), { wrapper })
      const notes = await result.current.getNotes()

      expect(mockRequest).toHaveBeenCalledWith({
        url: 'user/user-1/resource/note/list',
        method: 'post',
        data: undefined,
      })
      expect(notes).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('rejects when API returns success: false', async () => {
      mockRequest.mockResolvedValue({
        data: { success: false, message: 'Not found' },
      })

      const { result } = renderHook(() => ApiRequest(), { wrapper })

      await expect(result.current.getBots()).rejects.toEqual({
        message: 'Not found',
        stack: 'utils.requests',
        cause: { data: { success: false, message: 'Not found' } },
      })
    })

    it('rejects when request throws network error', async () => {
      mockRequest.mockRejectedValue(new Error('Network Error'))

      const { result } = renderHook(() => ApiRequest(), { wrapper })

      await expect(result.current.getBots()).rejects.toThrow('Network Error')
    })
  })

  describe('getContent', () => {
    it('sends GET request to content endpoint', async () => {
      mockRequest.mockResolvedValue({
        data: { success: true, data: [] },
      })

      const { result } = renderHook(() => ApiRequest(), { wrapper })
      await result.current.getContent()

      expect(mockRequest).toHaveBeenCalledWith({
        url: 'user/user-1/content',
        method: 'get',
        data: undefined,
      })
    })
  })

  describe('getBotModels', () => {
    it('uses "baita" as userId override', async () => {
      mockRequest.mockResolvedValue({
        data: { success: true, data: [] },
      })

      const { result } = renderHook(() => ApiRequest(), { wrapper })
      await result.current.getBotModels()

      expect(mockRequest).toHaveBeenCalledWith({
        url: 'user/baita/resource/model/list',
        method: 'post',
        data: undefined,
      })
    })
  })
})
