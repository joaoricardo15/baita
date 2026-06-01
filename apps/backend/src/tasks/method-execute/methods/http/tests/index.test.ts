/**
 * OAuth2 Request Method Tests
 *
 * User Journey: Bot Lifecycle (Runtime Execution — OAuth API Calls)
 * Tests the oauth2Request handler that refreshes tokens and makes
 * authenticated API calls to partners (Pipedrive, Google, etc.).
 *
 * Covers:
 * - Token refresh with Basic auth (Pipedrive pattern)
 * - Token refresh with body params (Google pattern)
 * - Credential persistence after refresh
 * - Bearer token injection into API request
 * - Output path extraction from response
 * - Error cases: missing connectionId, no refresh_token, no auth config
 */
process.env.TABLE_NAME = 'test-table'
process.env.PIPEDRIVE_CLIENT_ID = 'pd-client-id'
process.env.PIPEDRIVE_CLIENT_SECRET = 'pd-client-secret'
process.env.GOOGLE_CLIENT_ID = 'google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret'

const mockAxios = jest.fn()
jest.mock('axios', () => ({
  __esModule: true,
  default: (...args: any[]) => mockAxios(...args),
}))

const mockResourceRead = jest.fn()
const mockResourceUpdate = jest.fn()
jest.mock('src/controllers/resource', () => {
  return jest.fn().mockImplementation(() => ({
    read: mockResourceRead,
    update: mockResourceUpdate,
  }))
})

jest.mock('src/utils/bot', () => ({
  getDataFromPath: jest.fn((data, path) => {
    if (!path) return undefined
    return path.split('.').reduce((obj: any, key: string) => obj?.[key], data)
  }),
  getMappedData: jest.fn((data, _mapping) => data),
}))

import { oauth2Request } from '../index'

describe('oauth2Request', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const basePipedriveInput = {
    userId: 'user-123',
    botId: 'bot-456',
    connectionId: 'conn-pd-1',
    appConfig: {
      apiUrl: 'https://api.pipedrive.com/v1',
      auth: {
        type: 'basic',
        method: 'post',
        url: 'https://oauth.pipedrive.com/oauth/token',
        headers: { 'Content-type': 'application/x-www-form-urlencoded' },
        fields: {
          username: 'PIPEDRIVE_CLIENT_ID',
          password: 'PIPEDRIVE_CLIENT_SECRET',
        },
      },
    },
    serviceConfig: { outputPath: 'data.items' },
    inputData: {
      method: 'get',
      path: 'persons/search',
      headers: {},
      bodyParams: {},
      queryParams: { term: 'John' },
    },
  }

  const baseGoogleInput = {
    userId: 'user-123',
    botId: 'bot-456',
    connectionId: 'conn-google-1',
    appConfig: {
      apiUrl: 'https://gmail.googleapis.com',
      auth: {
        type: 'body',
        method: 'post',
        url: 'https://accounts.google.com/o/oauth2/token',
        headers: { 'Content-type': 'application/x-www-form-urlencoded' },
        fields: {
          username: 'GOOGLE_CLIENT_ID',
          password: 'GOOGLE_CLIENT_SECRET',
        },
      },
    },
    serviceConfig: { outputPath: 'messages' },
    inputData: {
      method: 'get',
      path: 'gmail/v1/users/me/messages',
      headers: {},
      bodyParams: {},
      queryParams: { maxResults: '10' },
    },
  }

  describe('Token refresh with Basic auth (Pipedrive)', () => {
    beforeEach(() => {
      mockResourceRead.mockResolvedValue({
        credentials: {
          access_token: 'old-access-token',
          refresh_token: 'pd-refresh-token',
        },
      })
      mockResourceUpdate.mockResolvedValue({})
    })

    test('sends credentials as Basic auth header', async () => {
      mockAxios
        .mockResolvedValueOnce({
          data: { access_token: 'new-pd-token', refresh_token: 'new-refresh' },
        })
        .mockResolvedValueOnce({
          data: { data: { items: [{ id: 1, name: 'John Doe' }] } },
        })

      await oauth2Request(basePipedriveInput)

      const refreshCall = mockAxios.mock.calls[0][0]
      expect(refreshCall.auth).toEqual({
        username: 'pd-client-id',
        password: 'pd-client-secret',
      })
    })

    test('sends refresh_token in body (not client credentials)', async () => {
      mockAxios
        .mockResolvedValueOnce({
          data: { access_token: 'new-pd-token' },
        })
        .mockResolvedValueOnce({ data: { data: { items: [] } } })

      await oauth2Request(basePipedriveInput)

      const refreshCall = mockAxios.mock.calls[0][0]
      const body = refreshCall.data
      expect(body).toContain('grant_type=refresh_token')
      expect(body).toContain('refresh_token=pd-refresh-token')
      expect(body).not.toContain('client_id')
      expect(body).not.toContain('client_secret')
    })

    test('persists refreshed credentials to DynamoDB', async () => {
      mockAxios
        .mockResolvedValueOnce({
          data: {
            access_token: 'refreshed-token',
            refresh_token: 'new-refresh-token',
          },
        })
        .mockResolvedValueOnce({ data: { data: { items: [] } } })

      await oauth2Request(basePipedriveInput)

      expect(mockResourceUpdate).toHaveBeenCalledWith(
        'conn-pd-1',
        expect.objectContaining({
          credentials: expect.objectContaining({
            access_token: 'refreshed-token',
            refresh_token: 'new-refresh-token',
          }),
        })
      )
    })

    test('injects Bearer token into API request', async () => {
      mockAxios
        .mockResolvedValueOnce({
          data: { access_token: 'fresh-token' },
        })
        .mockResolvedValueOnce({ data: { data: { items: [] } } })

      await oauth2Request(basePipedriveInput)

      const apiCall = mockAxios.mock.calls[1][0]
      expect(apiCall.headers.Authorization).toBe('Bearer fresh-token')
      expect(apiCall.url).toBe('https://api.pipedrive.com/v1/persons/search')
      expect(apiCall.params).toEqual({ term: 'John' })
    })
  })

  describe('Token refresh with body params (Google)', () => {
    beforeEach(() => {
      mockResourceRead.mockResolvedValue({
        credentials: {
          access_token: 'old-google-token',
          refresh_token: 'google-refresh-token',
        },
      })
      mockResourceUpdate.mockResolvedValue({})
    })

    test('sends client credentials in body (no Basic header)', async () => {
      mockAxios
        .mockResolvedValueOnce({
          data: { access_token: 'new-google-token' },
        })
        .mockResolvedValueOnce({ data: { messages: [] } })

      await oauth2Request(baseGoogleInput)

      const refreshCall = mockAxios.mock.calls[0][0]
      expect(refreshCall.auth).toBeUndefined()
      const body = refreshCall.data
      expect(body).toContain('client_id=google-client-id')
      expect(body).toContain('client_secret=google-client-secret')
      expect(body).toContain('grant_type=refresh_token')
    })
  })

  describe('Error handling', () => {
    test('throws when connectionId is missing', async () => {
      const input = { ...basePipedriveInput, connectionId: undefined }

      await expect(oauth2Request(input)).rejects.toThrow('No connectionId')
    })

    test('throws when auth config is missing', async () => {
      const input = {
        ...basePipedriveInput,
        appConfig: { apiUrl: 'https://api.test.com' },
      }

      await expect(oauth2Request(input)).rejects.toThrow('No appConfig.auth')
    })

    test('throws when refresh_token is missing from credentials', async () => {
      mockResourceRead.mockResolvedValue({
        credentials: { access_token: 'token-only' },
      })

      await expect(oauth2Request(basePipedriveInput)).rejects.toThrow(
        'No refresh token'
      )
    })

    test('throws when connection is not found', async () => {
      mockResourceRead.mockResolvedValue(null)

      await expect(oauth2Request(basePipedriveInput)).rejects.toThrow()
    })
  })

  describe('Response handling', () => {
    beforeEach(() => {
      mockResourceRead.mockResolvedValue({
        credentials: {
          access_token: 'old-token',
          refresh_token: 'refresh-token',
        },
      })
      mockResourceUpdate.mockResolvedValue({})
    })

    test('keeps old refresh_token if provider does not return new one', async () => {
      mockAxios
        .mockResolvedValueOnce({
          data: { access_token: 'new-token' },
        })
        .mockResolvedValueOnce({ data: { data: { items: [] } } })

      await oauth2Request(basePipedriveInput)

      expect(mockResourceUpdate).toHaveBeenCalledWith(
        'conn-pd-1',
        expect.objectContaining({
          credentials: expect.objectContaining({
            access_token: 'new-token',
            refresh_token: 'refresh-token',
          }),
        })
      )
    })
  })
})
