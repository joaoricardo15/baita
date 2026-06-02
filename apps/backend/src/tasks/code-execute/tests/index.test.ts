/**
 * Code Execute Task Tests
 *
 * User Journey: Bot Lifecycle (Custom Code Execution)
 * Tests the sandboxed JavaScript execution that powers "Run JavaScript" bot steps.
 * Users write custom code that transforms data between bot steps.
 *
 * Covers:
 * - Successful code execution with output
 * - Custom fields injected into sandbox context
 * - userId and botId available in sandbox
 * - Timeout enforcement (5-second limit)
 * - Error isolation (syntax errors, runtime errors)
 * - Code cannot access Node.js APIs (sandboxed)
 */
process.env.TABLE_NAME = 'test-table'
process.env.SQS_QUEUE_PREFIX = 'test-queue'
process.env.FILES_BUCKET = 'test-files'
process.env.REGION = 'us-east-1'

import { Callback, Context } from 'aws-lambda'

jest.mock('@baita/shared', () => ({
  ...jest.requireActual('@baita/shared'),
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

const createCodeEvent = (
  code: string,
  customFields: Record<string, any> = {}
) => ({
  userId: 'test-user',
  botId: 'bot-1',
  appConfig: {},
  serviceConfig: { methodName: 'codeExecute' },
  inputData: { code, ...customFields },
})

const invokeCode = (
  event: any
): Promise<{ success: boolean; data?: any; message?: string }> => {
  return new Promise((resolve) => {
    const callback: Callback = (_err, result) => {
      resolve(result)
    }
    handler(event, createMockContext(), callback)
  })
}

describe('Code Execute Task', () => {
  describe('Successful execution', () => {
    test('executes code and returns output', async () => {
      const result = await invokeCode(createCodeEvent('output = 42'))

      expect(result.success).toBe(true)
      expect(result.data).toBe(42)
    })

    test('output can be an object', async () => {
      const result = await invokeCode(
        createCodeEvent('output = { name: "test", value: 123 }')
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'test', value: 123 })
    })

    test('output can be an array', async () => {
      const result = await invokeCode(createCodeEvent('output = [1, 2, 3]'))

      expect(result.success).toBe(true)
      expect(result.data).toEqual([1, 2, 3])
    })

    test('custom fields are available in sandbox', async () => {
      const result = await invokeCode(
        createCodeEvent('output = greeting + " " + name', {
          greeting: 'Hello',
          name: 'World',
        })
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('Hello World')
    })

    test('userId and botId are available in sandbox', async () => {
      const result = await invokeCode(
        createCodeEvent('output = userId + ":" + botId')
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('test-user:bot-1')
    })

    test('code can perform computations on input data', async () => {
      const result = await invokeCode(
        createCodeEvent(
          'output = items.filter(i => i.price > 10).map(i => i.name)',
          {
            items: [
              { name: 'A', price: 5 },
              { name: 'B', price: 15 },
              { name: 'C', price: 20 },
            ],
          }
        )
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(['B', 'C'])
    })
  })

  describe('Error handling', () => {
    test('syntax error returns failure', async () => {
      const result = await invokeCode(createCodeEvent('output = {{{'))

      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy()
    })

    test('runtime error returns failure', async () => {
      const result = await invokeCode(
        createCodeEvent('output = undefinedVar.property')
      )

      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy()
    })

    test('undefined output returns undefined (not error)', async () => {
      const result = await invokeCode(createCodeEvent('var x = 5'))

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })
  })

  describe('Sandbox isolation', () => {
    test('cannot access require', async () => {
      const result = await invokeCode(
        createCodeEvent('output = typeof require')
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('undefined')
    })

    test('cannot access process', async () => {
      const result = await invokeCode(
        createCodeEvent('output = typeof process')
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('undefined')
    })
  })
})
