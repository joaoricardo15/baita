/**
 * OAuth Connector Handler Tests
 *
 * User Journey: Partner Connections (OAuth)
 * Tests the generic OAuth callback handler that processes authorization codes
 * from all OAuth partners (Google, Pipedrive, etc.).
 *
 * Covers:
 * - State parameter deconstruction
 * - Token exchange with Basic auth (Pipedrive)
 * - Token exchange with body params (Google)
 * - User info fetching with nested JSON paths
 * - Connection storage in DynamoDB
 * - Error handling (missing params, unknown connector, token exchange failure)
 */
process.env.TABLE_NAME = 'test-table'
process.env.SERVICE_API_URL = 'https://api.baita.help'
process.env.PIPEDRIVE_CLIENT_ID = 'test-pipedrive-client-id'
process.env.PIPEDRIVE_CLIENT_SECRET = 'test-pipedrive-client-secret'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'

import { Callback, Context } from 'aws-lambda'

const mockAxiosPost = jest.fn()
const mockAxiosGet = jest.fn()

jest.mock('axios', () => ({
  post: (...args: any[]) => mockAxiosPost(...args),
  get: (...args: any[]) => mockAxiosGet(...args),
}))

const mockDataCreate = jest.fn()
jest.mock('@/controllers/data', () => {
  return jest.fn().mockImplementation(() => ({
    create: mockDataCreate,
  }))
})

const mockAddConnection = jest.fn()
jest.mock('@/controllers/bot', () => {
  return jest.fn().mockImplementation(() => ({
    addConnection: mockAddConnection,
  }))
})

const { handler } = require('../callback')

const createMockContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-oauth',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123:function:test-oauth',
  memoryLimitInMB: '512',
  awsRequestId: 'req-1',
  logGroupName: '/aws/lambda/test-oauth',
  logStreamName: '2024/01/01/test-oauth',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
})

const invokeHandler = (
  queryStringParameters: Record<string, string> | null
): Promise<any> => {
  return new Promise((resolve) => {
    const callback: Callback = (_err, result) => {
      resolve(result)
    }
    const event = {
      queryStringParameters,
      headers: {},
      httpMethod: 'GET',
      path: '/oauth/callback',
      requestContext: { requestTimeEpoch: Date.now() },
    }
    handler(event, createMockContext(), callback)
  })
}

// Journey: OAuth Connections — token exchange after user authorizes at provider
describe('OAuth Connector Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Error param handling', () => {
    test('responds with fail status when error param present', async () => {
      const result = await invokeHandler({
        error: 'access_denied',
        state: 'test',
      })

      expect(result.statusCode).toBe(200)
      expect(mockAxiosPost).not.toHaveBeenCalled()
    })

    test('responds with fail when code is missing', async () => {
      const result = await invokeHandler({ state: 'some-state' })

      expect(result.statusCode).toBe(200)
    })

    test('responds with fail when state is missing', async () => {
      const result = await invokeHandler({ code: 'auth-code' })

      expect(result.statusCode).toBe(200)
    })
  })

  describe('Pipedrive token exchange (Basic auth)', () => {
    const pipedriveState = 'app-id-123:user-id-456:bot-id-789:0:pipedrive'

    beforeEach(() => {
      mockAxiosPost.mockResolvedValue({
        data: {
          access_token: 'pd-access-token',
          refresh_token: 'pd-refresh-token',
          token_type: 'bearer',
        },
      })
      mockAxiosGet.mockResolvedValue({
        data: {
          data: { id: 12345, email: 'user@company.com', name: 'Test User' },
        },
      })
      mockDataCreate.mockResolvedValue({})
      mockAddConnection.mockResolvedValue({})
    })

    test('exchanges code using Basic auth header', async () => {
      await invokeHandler({
        code: 'pipedrive-auth-code',
        state: pipedriveState,
      })

      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://oauth.pipedrive.com/oauth/token',
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      )

      const postBody = mockAxiosPost.mock.calls[0][1]
      expect(postBody).toContain('code=pipedrive-auth-code')
      expect(postBody).toContain('grant_type=authorization_code')
      expect(postBody).toContain(
        'redirect_uri=https%3A%2F%2Fapi.baita.help%2Foauth%2Fcallback'
      )
      expect(postBody).not.toContain('client_id')
      expect(postBody).not.toContain('client_secret')
    })

    test('encodes credentials correctly in Basic header', async () => {
      await invokeHandler({ code: 'auth-code', state: pipedriveState })

      const headers = mockAxiosPost.mock.calls[0][2].headers
      const expected = Buffer.from(
        'test-pipedrive-client-id:test-pipedrive-client-secret'
      ).toString('base64')
      expect(headers.Authorization).toBe(`Basic ${expected}`)
    })

    test('fetches user info with nested path (data.id)', async () => {
      await invokeHandler({ code: 'auth-code', state: pipedriveState })

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://api.pipedrive.com/v1/users/me',
        expect.objectContaining({
          headers: { Authorization: 'Bearer pd-access-token' },
        })
      )
    })

    test('creates connection with correct data', async () => {
      await invokeHandler({ code: 'auth-code', state: pipedriveState })

      expect(mockDataCreate).toHaveBeenCalledWith(
        '12345',
        expect.objectContaining({
          userId: 'user-id-456',
          appId: 'app-id-123',
          connectionId: '12345',
          credentials: {
            access_token: 'pd-access-token',
            refresh_token: 'pd-refresh-token',
            token_type: 'bearer',
          },
        })
      )
    })

    test('links connection to bot task', async () => {
      await invokeHandler({ code: 'auth-code', state: pipedriveState })

      expect(mockAddConnection).toHaveBeenCalledWith(
        'user-id-456',
        'bot-id-789',
        '12345',
        0
      )
    })
  })

  describe('Google token exchange (body params)', () => {
    const googleState = 'app-id-google:user-id-456:bot-id-789:1:google'

    beforeEach(() => {
      mockAxiosPost.mockResolvedValue({
        data: {
          access_token: 'google-access-token',
          refresh_token: 'google-refresh-token',
        },
      })
      mockAxiosGet.mockResolvedValue({
        data: { sub: 'google-user-123', email: 'user@gmail.com' },
      })
      mockDataCreate.mockResolvedValue({})
      mockAddConnection.mockResolvedValue({})
    })

    test('exchanges code using body params (no Basic header)', async () => {
      await invokeHandler({ code: 'google-auth-code', state: googleState })

      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      )

      const postBody = mockAxiosPost.mock.calls[0][1]
      expect(postBody).toContain('client_id=test-google-client-id')
      expect(postBody).toContain('client_secret=test-google-client-secret')
    })
  })

  describe('Unknown connector', () => {
    test('fails gracefully for unknown connector ID', async () => {
      const unknownState = 'app-id:user-id:bot-id:0:nonexistent'
      const result = await invokeHandler({
        code: 'auth-code',
        state: unknownState,
      })

      expect(result.statusCode).toBe(200)
      expect(mockAxiosPost).not.toHaveBeenCalled()
    })
  })

  describe('Token exchange failure', () => {
    test('handles token exchange error gracefully', async () => {
      const state = 'app-id:user-id:bot-id:0:pipedrive'
      mockAxiosPost.mockRejectedValue(new Error('Token exchange failed'))

      const result = await invokeHandler({ code: 'bad-code', state })

      expect(result.statusCode).toBe(200)
      expect(mockDataCreate).not.toHaveBeenCalled()
    })
  })
})
