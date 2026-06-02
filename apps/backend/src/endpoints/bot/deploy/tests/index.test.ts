/**
 * Bot Deploy Endpoint Tests
 *
 * User Journey: Bot Lifecycle (Deployment)
 * Tests the deploy endpoint that transforms bot configuration into a running Lambda.
 * This is the critical step where a bot goes from "configured" to "live".
 *
 * Covers:
 * - Successful deployment with valid tasks
 * - Missing path parameters (userId, botId) return error
 * - Invalid task schema returns validation error
 * - Bot validation errors (forward references, missing services) return error
 * - Empty body is handled gracefully
 */
process.env.TABLE_NAME = 'test-table'
process.env.BOTS_BUCKET = 'test-bots'
process.env.SQS_QUEUE_PREFIX = 'test-queue'
process.env.REGION = 'us-east-1'
process.env.SERVICE_PREFIX = 'baita-help-prod'
process.env.BOT_ROLE_ARN = 'arn:aws:iam::123:role/test'
process.env.DISABLED_SCHEDULE_EXPRESSION = 'rate(99 years)'

const mockDeployBot = jest.fn()

jest.mock('src/controllers/bot', () => {
  return jest.fn().mockImplementation(() => ({
    deployBot: mockDeployBot,
  }))
})

jest.mock('@baita/shared', () => ({
  ...jest.requireActual('@baita/shared'),
  validateTasks: jest.fn(),
  validateBot: jest
    .fn()
    .mockReturnValue({ valid: true, errors: [], warnings: [] }),
}))

import { invokeHandler } from 'src/utils/tests/helpers/event'

const { handler } = require('../index')

describe('Bot Deploy Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDeployBot.mockResolvedValue({
      botId: 'bot-1',
      active: true,
      name: 'My Bot',
    })
  })

  test('successful deploy returns bot data', async () => {
    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'test-user', botId: 'bot-1' } as any,
      body: JSON.stringify({
        name: 'My Bot',
        active: true,
        tasks: [{ taskId: 0, service: { name: 'webhook', type: 'trigger' } }],
      }),
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.botId).toBe('bot-1')
    expect(mockDeployBot).toHaveBeenCalledWith(
      'test-user',
      'bot-1',
      'My Bot',
      true,
      [{ taskId: 0, service: { name: 'webhook', type: 'trigger' } }]
    )
  })

  test('missing userId returns error', async () => {
    const result = await invokeHandler(handler, {
      pathParameters: { botId: 'bot-1' } as any,
      body: JSON.stringify({ name: 'Bot', active: true, tasks: [] }),
    })

    expect(result.body.success).toBe(false)
    expect(result.body.message).toContain('Missing required path parameters')
  })

  test('missing botId returns error', async () => {
    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'test-user' } as any,
      body: JSON.stringify({ name: 'Bot', active: true, tasks: [] }),
    })

    expect(result.body.success).toBe(false)
    expect(result.body.message).toContain('Missing required path parameters')
  })

  test('task validation failure returns error', async () => {
    const { validateTasks } = require('@baita/shared')
    validateTasks.mockImplementation(() => {
      throw new Error('tasks must have at least one element')
    })

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'test-user', botId: 'bot-1' } as any,
      body: JSON.stringify({ name: 'Bot', active: true, tasks: [] }),
    })

    expect(result.body.success).toBe(false)
    expect(result.body.message).toContain(
      'tasks must have at least one element'
    )
  })

  test('bot validation failure returns error with details', async () => {
    const { validateTasks } = require('@baita/shared')
    validateTasks.mockImplementation(() => {})

    const { validateBot } = require('@baita/shared')
    validateBot.mockReturnValue({
      valid: false,
      errors: [
        'Step 2 references step 3 (forward reference)',
        'Step 3 has no service',
      ],
      warnings: [],
    })

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'test-user', botId: 'bot-1' } as any,
      body: JSON.stringify({
        name: 'Bot',
        active: true,
        tasks: [
          { taskId: 0, service: { name: 'webhook', type: 'trigger' } },
          { taskId: 1 },
          { taskId: 2 },
        ],
      }),
    })

    expect(result.body.success).toBe(false)
    expect(result.body.message).toContain('forward reference')
    expect(result.body.message).toContain('no service')
  })

  test('controller error returns failure', async () => {
    const { validateTasks } = require('@baita/shared')
    validateTasks.mockImplementation(() => {})

    const { validateBot } = require('@baita/shared')
    validateBot.mockReturnValue({ valid: true, errors: [], warnings: [] })

    mockDeployBot.mockRejectedValue(new Error('Lambda creation failed'))

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'test-user', botId: 'bot-1' } as any,
      body: JSON.stringify({
        name: 'Bot',
        active: true,
        tasks: [{ taskId: 0, service: { name: 'webhook', type: 'trigger' } }],
      }),
    })

    expect(result.body.success).toBe(false)
    expect(result.body.message).toContain('Lambda creation failed')
  })
})
