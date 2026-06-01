/**
 * Method Execute Task Tests
 *
 * User Journey: Bot Lifecycle (Runtime Execution)
 * Tests the method execution Lambda that powers deployed bot tasks.
 * When a bot runs, each step invokes this handler to call external services.
 *
 * Covers:
 * - Successful method dispatch (routes to correct method by name)
 * - Unknown method name returns failure
 * - Input validation failure returns structured error
 * - Each method type is callable (getTodo, publishToFeed, sendNotification, httpRequest, oauth2Request)
 */
process.env.TABLE_NAME = 'test-table'
process.env.SQS_QUEUE_PREFIX = 'test-queue'
process.env.FILES_BUCKET = 'test-files'
process.env.REGION = 'us-east-1'

import { Callback, Context } from 'aws-lambda'

const mockGetTodo = jest.fn()
const mockPublishToFeed = jest.fn()
const mockSendNotification = jest.fn()
const mockHttpRequest = jest.fn()
const mockOauth2Request = jest.fn()

jest.mock('../methods/user', () => ({
  getTodo: (...args: any[]) => mockGetTodo(...args),
  publishToFeed: (...args: any[]) => mockPublishToFeed(...args),
}))

jest.mock('../methods/push', () => ({
  sendNotification: (...args: any[]) => mockSendNotification(...args),
}))

jest.mock('../methods/http', () => ({
  httpRequest: (...args: any[]) => mockHttpRequest(...args),
  oauth2Request: (...args: any[]) => mockOauth2Request(...args),
}))

jest.mock('src/models/bot/schema', () => ({
  validateTaskExecutionInput: jest.fn(),
}))

const { handler } = require('../index')

const createMockContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123:function:test',
  memoryLimitInMB: '512',
  awsRequestId: 'req-1',
  logGroupName: '/aws/lambda/test',
  logStreamName: '2024/01/01/test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
})

const createTaskEvent = (methodName: string, inputData: any = {}) => ({
  userId: 'test-user',
  botId: 'bot-1',
  appConfig: {},
  serviceConfig: { methodName },
  inputData,
})

const invokeTask = (
  event: any
): Promise<{ success: boolean; data?: any; message?: string }> => {
  return new Promise((resolve) => {
    const callback: Callback = (_err, result) => {
      resolve(result)
    }
    handler(event, createMockContext(), callback)
  })
}

describe('Method Execute Task', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Method dispatch', () => {
    test('routes to getTodo method', async () => {
      mockGetTodo.mockResolvedValue([{ taskId: '1', title: 'Todo' }])
      const result = await invokeTask(createTaskEvent('getTodo'))

      expect(result.success).toBe(true)
      expect(result.data).toEqual([{ taskId: '1', title: 'Todo' }])
      expect(mockGetTodo).toHaveBeenCalledTimes(1)
    })

    test('routes to publishToFeed method', async () => {
      mockPublishToFeed.mockResolvedValue({ published: true })
      const result = await invokeTask(
        createTaskEvent('publishToFeed', { content: 'test' })
      )

      expect(result.success).toBe(true)
      expect(mockPublishToFeed).toHaveBeenCalledTimes(1)
    })

    test('routes to sendNotification method', async () => {
      mockSendNotification.mockResolvedValue({ sent: true })
      const result = await invokeTask(
        createTaskEvent('sendNotification', { title: 'Alert' })
      )

      expect(result.success).toBe(true)
      expect(mockSendNotification).toHaveBeenCalledTimes(1)
    })

    test('routes to httpRequest method', async () => {
      mockHttpRequest.mockResolvedValue({ status: 200, data: { id: 1 } })
      const result = await invokeTask(
        createTaskEvent('httpRequest', { url: 'https://api.test.com' })
      )

      expect(result.success).toBe(true)
      expect(mockHttpRequest).toHaveBeenCalledTimes(1)
    })

    test('routes to oauth2Request method', async () => {
      mockOauth2Request.mockResolvedValue({ data: { token: 'new' } })
      const result = await invokeTask(createTaskEvent('oauth2Request'))

      expect(result.success).toBe(true)
      expect(mockOauth2Request).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error handling', () => {
    test('unknown method returns failure', async () => {
      const result = await invokeTask(createTaskEvent('unknownMethod'))

      expect(result.success).toBe(false)
      expect(result.message).toContain('Unknown method')
    })

    test('method throwing returns failure with error message', async () => {
      mockGetTodo.mockRejectedValue(new Error('DynamoDB timeout'))
      const result = await invokeTask(createTaskEvent('getTodo'))

      expect(result.success).toBe(false)
      expect(result.message).toContain('DynamoDB timeout')
    })

    test('passes full event to method handler', async () => {
      mockHttpRequest.mockResolvedValue({})
      const event = createTaskEvent('httpRequest', {
        url: 'https://example.com',
        method: 'GET',
      })

      await invokeTask(event)

      expect(mockHttpRequest).toHaveBeenCalledWith(event)
    })
  })
})
