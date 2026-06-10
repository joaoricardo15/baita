// Infrastructure: API response formatting, error parsing, and timeout safety
import { TaskExecutionStatus } from '@baita/shared'
import { APIGatewayProxyEvent } from 'aws-lambda'

import Api, { ApiRequestStatus } from '@/utils/api'

const mockEvent = {
  httpMethod: 'GET',
  path: '/test',
  headers: {
    'X-Amzn-Trace-Id': 'Root=1-test-trace',
    origin: 'https://www.baita.help',
    'X-Forwarded-For': '127.0.0.1',
    'User-Agent': 'jest-test',
  },
  multiValueHeaders: {},
  body: null,
  isBase64Encoded: false,
  resource: '/test',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    authorizer: { userId: 'auth0|test-user-123' },
    resourceId: '',
    resourcePath: '/test',
    httpMethod: 'GET',
    extendedRequestId: '',
    requestTime: '',
    path: '/test',
    accountId: '',
    protocol: 'HTTP/1.1',
    stage: 'prod',
    domainPrefix: '',
    requestTimeEpoch: 0,
    requestId: '',
    identity: {
      cognitoIdentityPoolId: null,
      accountId: null,
      cognitoIdentityId: null,
      caller: null,
      sourceIp: '127.0.0.1',
      principalOrgId: null,
      accessKey: null,
      cognitoAuthenticationType: null,
      cognitoAuthenticationProvider: null,
      userArn: null,
      userAgent: 'jest-test',
      user: null,
      apiKey: null,
      apiKeyId: null,
      clientCert: null,
    },
    domainName: '',
    deploymentId: '',
    apiId: '',
  },
} as unknown as APIGatewayProxyEvent

const mockContext = {
  getRemainingTimeInMillis: () => 30000,
  functionName: 'test-function',
  callbackWaitsForEmptyEventLoop: false,
  functionVersion: '1',
  invokedFunctionArn: '',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id-123',
  logGroupName: '',
  logStreamName: '',
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
}

describe('Api', () => {
  describe('parseError', () => {
    const api = new Api(mockEvent, mockContext)

    test('should parse string error', () => {
      expect(api.parseError('Something went wrong')).toBe(
        'Something went wrong'
      )
    })

    test('should parse number error', () => {
      expect(api.parseError(404)).toBe('404')
    })

    test('should parse Error instance', () => {
      expect(api.parseError(new Error('Test error'))).toBe('Test error')
    })

    test('should parse object error as JSON', () => {
      expect(api.parseError({ code: 'ERR', detail: 'bad' })).toBe(
        '{"code":"ERR","detail":"bad"}'
      )
    })

    test('should extract message field from object error', () => {
      expect(api.parseError({ message: 'Access denied' })).toBe('Access denied')
    })

    test('should extract errorMessage field from object error', () => {
      expect(api.parseError({ errorMessage: 'Lambda timeout' })).toBe(
        'Lambda timeout'
      )
    })

    test('should extract error field from object error', () => {
      expect(api.parseError({ error: 'Not found' })).toBe('Not found')
    })

    test('should join AJV validation errors', () => {
      expect(
        api.parseError({
          errors: [
            { message: 'must have property name' },
            { message: 'must be string' },
          ],
        })
      ).toBe('must have property name; must be string')
    })

    test('should return fallback message for unrecognized types', () => {
      expect(api.parseError(true)).toBe('An unexpected error occurred')
    })

    test('should return empty string for falsy values', () => {
      expect(api.parseError(null)).toBe('')
      expect(api.parseError(undefined)).toBe('')
      expect(api.parseError(0)).toBe('')
    })
  })

  describe('httpResponse', () => {
    test('should return success response', () => {
      const api = new Api(mockEvent, mockContext)
      const callback = jest.fn()

      api.httpResponse(callback, ApiRequestStatus.success, undefined, {
        id: '123',
      })

      expect(callback).toHaveBeenCalledWith(null, {
        statusCode: 200,
        headers: {
          'Content-type': 'application/json',
          'Access-Control-Allow-Origin': 'https://www.baita.help',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: true,
          message: '',
          data: { id: '123' },
        }),
      })
    })

    test('should return failure response with error message', () => {
      const api = new Api(mockEvent, mockContext)
      const callback = jest.fn()

      api.httpResponse(callback, ApiRequestStatus.fail, new Error('Not found'))

      expect(callback).toHaveBeenCalledWith(null, {
        statusCode: 200,
        headers: {
          'Content-type': 'application/json',
          'Access-Control-Allow-Origin': 'https://www.baita.help',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: false,
          message: 'Not found',
          data: undefined,
        }),
      })
    })
  })

  describe('httpConnectorResponse', () => {
    test('should return HTML with window.close script', () => {
      const api = new Api(mockEvent, mockContext)
      const callback = jest.fn()

      api.httpConnectorResponse(callback, ApiRequestStatus.success)

      expect(callback).toHaveBeenCalledWith(null, {
        statusCode: 200,
        headers: { 'Content-type': 'text/html' },
        body: '<script>window.close()</script>',
      })
    })
  })

  describe('taskExecutionResponse', () => {
    test('should return task execution result', () => {
      const api = new Api(mockEvent, mockContext)
      const callback = jest.fn()

      api.taskExecutionResponse(
        callback,
        TaskExecutionStatus.success,
        undefined,
        { result: 'ok' }
      )

      expect(callback).toHaveBeenCalledWith(null, {
        success: true,
        message: '',
        data: { result: 'ok' },
      })
    })

    test('should return failure for failed task', () => {
      const api = new Api(mockEvent, mockContext)
      const callback = jest.fn()

      api.taskExecutionResponse(
        callback,
        TaskExecutionStatus.fail,
        'Task timed out'
      )

      expect(callback).toHaveBeenCalledWith(null, {
        success: false,
        message: 'Task timed out',
        data: undefined,
      })
    })
  })

  describe('structured log format', () => {
    test('should emit structured JSON with all expected fields', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const api = new Api(mockEvent, mockContext)
      const callback = jest.fn()

      api.httpResponse(callback, ApiRequestStatus.success, undefined, {
        items: [],
      })

      const logCall = consoleSpy.mock.calls[0][0]
      const logEntry = JSON.parse(logCall)

      expect(logEntry).toMatchObject({
        level: 'INFO',
        service: 'baita-api',
        requestId: 'test-request-id-123',
        traceId: 'Root=1-test-trace',
        method: 'GET',
        path: '/test',
        status: 'success',
        userId: 'test-user-123',
        origin: 'https://www.baita.help',
        ip: '127.0.0.1',
        userAgent: 'jest-test',
      })
      expect(logEntry.timestamp).toBeDefined()
      expect(logEntry.durationMs).toBeGreaterThanOrEqual(0)
      expect(logEntry.message).toBe('GET /test → success')
      expect(logEntry.responseBody).toEqual({
        success: true,
        message: '',
        data: { items: [] },
      })

      consoleSpy.mockRestore()
    })

    test('should emit ERROR level for failures', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const api = new Api(mockEvent, mockContext)
      const callback = jest.fn()

      api.httpResponse(callback, ApiRequestStatus.fail, new Error('Boom'))

      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0])

      expect(logEntry.level).toBe('ERROR')
      expect(logEntry.error).toBe('Boom')
      expect(logEntry.message).toBe('GET /test → fail: Boom')

      consoleSpy.mockRestore()
    })

    test('should parse request body from event', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const eventWithBody = {
        ...mockEvent,
        body: JSON.stringify({ name: 'test', email: 'a@b.com' }),
      } as unknown as APIGatewayProxyEvent

      const api = new Api(eventWithBody, mockContext)
      const callback = jest.fn()

      api.httpResponse(callback, ApiRequestStatus.success)

      const logEntry = JSON.parse(consoleSpy.mock.calls[0][0])
      expect(logEntry.requestBody).toEqual({ name: 'test', email: 'a@b.com' })

      consoleSpy.mockRestore()
    })

    test('should not include Authorization or X-Api-Key in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const sensitiveEvent = {
        ...mockEvent,
        headers: {
          ...mockEvent.headers,
          Authorization: 'Bearer secret-jwt-token',
          'X-Api-Key': 'secret-api-key',
        },
      } as unknown as APIGatewayProxyEvent

      const api = new Api(sensitiveEvent, mockContext)
      const callback = jest.fn()

      api.httpResponse(callback, ApiRequestStatus.success)

      const logOutput = consoleSpy.mock.calls[0][0]
      expect(logOutput).not.toContain('secret-jwt-token')
      expect(logOutput).not.toContain('secret-api-key')

      consoleSpy.mockRestore()
    })
  })
})
