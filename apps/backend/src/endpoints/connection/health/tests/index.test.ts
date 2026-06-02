process.env.CORE_TABLE = 'test-table'
process.env.SERVICE_API_URL = 'https://api.baita.help'
process.env.PIPEDRIVE_CLIENT_ID = 'test-pipedrive-client-id'
process.env.PIPEDRIVE_CLIENT_SECRET = 'test-pipedrive-client-secret'

import { invokeHandler } from 'src/utils/tests/helpers/event'

const mockAxiosRequest = jest.fn()

jest.mock('axios', () => ({
  request: (...args: any[]) => mockAxiosRequest(...args),
  post: jest.fn(),
  get: jest.fn(),
}))

jest.mock('src/controllers/resource')
jest.mock('src/utils/tokenRefresh')

const Resource = require('src/controllers/resource').default
const { refreshOAuth2Token } = require('src/utils/tokenRefresh')
const { handler } = require('../index')

const mockRead = jest.fn()
const mockUpdate = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  Resource.mockImplementation(() => ({
    read: mockRead,
    update: mockUpdate,
  }))
  mockUpdate.mockResolvedValue({})
})

describe('connection health endpoint', () => {
  it('returns healthy when health check succeeds', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#123',
      appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
      connectorId: 'pipedrive',
      connectionId: '123',
      credentials: { access_token: 'valid-token', refresh_token: 'refresh' },
    })

    mockAxiosRequest.mockResolvedValue({ data: { success: true } })

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: '123' },
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.status).toBe('healthy')
  })

  it('returns unknown when no connector manifest found', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#123',
      appId: 'unknown-app-id',
      connectionId: '123',
      credentials: { access_token: 'token' },
    })

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: '123' },
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.status).toBe('unknown')
  })

  it('returns error when connection not found', async () => {
    mockRead.mockResolvedValue(undefined)

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: 'nonexistent' },
    })

    expect(result.body.success).toBe(false)
  })

  it('refreshes token on 401 and retries', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#123',
      appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
      connectorId: 'pipedrive',
      connectionId: '123',
      credentials: { access_token: 'expired', refresh_token: 'refresh' },
    })

    mockAxiosRequest
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({ data: { success: true } })

    refreshOAuth2Token.mockResolvedValue({
      access_token: 'new-token',
      refresh_token: 'refresh',
    })

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: '123' },
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.status).toBe('healthy')
    expect(refreshOAuth2Token).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('returns expired when refresh fails', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#123',
      appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
      connectorId: 'pipedrive',
      connectionId: '123',
      credentials: { access_token: 'expired', refresh_token: 'refresh' },
    })

    mockAxiosRequest.mockRejectedValue({ response: { status: 401 } })
    refreshOAuth2Token.mockRejectedValue(new Error('refresh failed'))

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: '123' },
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.status).toBe('expired')
  })

  it('returns error when health check fails with non-401', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#123',
      appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
      connectorId: 'pipedrive',
      connectionId: '123',
      credentials: { access_token: 'token', refresh_token: 'refresh' },
    })

    mockAxiosRequest.mockRejectedValue({ response: { status: 500 } })

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: '123' },
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.status).toBe('error')
  })
})
