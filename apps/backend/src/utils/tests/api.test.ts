import { TaskExecutionStatus } from '@baita/shared'
import Api, { ApiRequestStatus } from '@/utils/api'

const mockContext = {
  getRemainingTimeInMillis: () => 30000,
  functionName: 'test-function',
  callbackWaitsForEmptyEventLoop: false,
  functionVersion: '1',
  invokedFunctionArn: '',
  memoryLimitInMB: '128',
  awsRequestId: '123',
  logGroupName: '',
  logStreamName: '',
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
}

describe('Api', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('parseError', () => {
    const api = new Api({}, mockContext)

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
      const api = new Api({}, mockContext)
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
      const api = new Api({}, mockContext)
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
      const api = new Api({}, mockContext)
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
      const api = new Api({}, mockContext)
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
      const api = new Api({}, mockContext)
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

  describe('timeout behavior', () => {
    test('should log timeout before lambda expires', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      new Api({ test: true }, mockContext)

      jest.advanceTimersByTime(29800)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"status":"timeout"')
      )

      consoleSpy.mockRestore()
    })

    test('should cancel timeout when response is sent', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const api = new Api({}, mockContext)
      const callback = jest.fn()

      api.httpResponse(callback, ApiRequestStatus.success, undefined, {})

      consoleSpy.mockClear()

      jest.advanceTimersByTime(30000)

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('"status":"timeout"')
      )

      consoleSpy.mockRestore()
    })
  })
})
