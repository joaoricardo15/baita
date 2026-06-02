import { invokeHandler } from '@/utils/tests/helpers/event'

jest.mock('@/controllers/resource')

const Resource = require('src/controllers/resource').default
const { handler } = require('../index')

const mockRead = jest.fn()
const mockList = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  Resource.mockImplementation((_userId: string, resourceName: string) => {
    if (resourceName === 'connection') return { read: mockRead }
    if (resourceName === 'bot') return { list: mockList }
    return {}
  })
})

describe('connection details endpoint', () => {
  it('returns connection and linked bots', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#conn-1',
      appId: 'test-app',
      connectionId: 'conn-1',
      name: 'Test Account',
      email: 'test@example.com',
      credentials: { access_token: 'secret' },
      createdAt: 1700000000000,
    })

    mockList.mockResolvedValue([
      {
        botId: 'bot-1',
        name: 'My Bot',
        tasks: [{ connectionId: 'conn-1' }, { connectionId: 'other' }],
      },
      {
        botId: 'bot-2',
        name: 'Other Bot',
        tasks: [{ connectionId: 'other' }],
      },
    ])

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: 'conn-1' },
    })

    expect(result.body.success).toBe(true)
    expect(result.body.data.connection.name).toBe('Test Account')
    expect(result.body.data.connection.credentials).toBeUndefined()
    expect(result.body.data.linkedBots).toHaveLength(1)
    expect(result.body.data.linkedBots[0].botId).toBe('bot-1')
  })

  it('returns empty linkedBots when no bots use the connection', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#conn-1',
      appId: 'test-app',
      connectionId: 'conn-1',
      name: 'Unused',
      email: 'unused@test.com',
      credentials: { access_token: 'secret' },
    })

    mockList.mockResolvedValue([
      { botId: 'bot-1', name: 'Bot', tasks: [{ connectionId: 'other' }] },
    ])

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: 'conn-1' },
    })

    expect(result.body.data.linkedBots).toHaveLength(0)
  })

  it('returns error when connection not found', async () => {
    mockRead.mockResolvedValue(undefined)

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: 'nonexistent' },
    })

    expect(result.body.success).toBe(false)
  })

  it('handles bots with no tasks array', async () => {
    mockRead.mockResolvedValue({
      userId: 'user-1',
      sortKey: '#CONNECTION#conn-1',
      appId: 'test-app',
      connectionId: 'conn-1',
      name: 'Test',
      email: 'test@test.com',
      credentials: { access_token: 'x' },
    })

    mockList.mockResolvedValue([{ botId: 'bot-1', name: 'Empty Bot' }])

    const result = await invokeHandler(handler, {
      pathParameters: { userId: 'user-1', connectionId: 'conn-1' },
    })

    expect(result.body.data.linkedBots).toHaveLength(0)
  })
})
