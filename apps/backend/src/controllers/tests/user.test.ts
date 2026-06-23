process.env.CORE_TABLE = 'test-table'
process.env.SERVICE_PREFIX = 'baita-backend-prod'
process.env.AUTH0_AUDIENCE = 'https://test.auth0.com/api/v2/'
process.env.AUTH0_M2M_CLIENT_ID = 'test-client-id'
process.env.AUTH0_M2M_CLIENT_SECRET = 'test-client-secret'

import {
  BatchWriteCommand,
  DynamoDBDocument,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('@/controllers/bot', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      deleteBot: jest.fn().mockResolvedValue(undefined),
    })),
  }
})

const ddbMock = mockClient(DynamoDBDocument)

import User from '../user'

beforeEach(() => {
  ddbMock.reset()
  jest.clearAllMocks()
})

describe('User', () => {
  describe('createUser', () => {
    it('stores user in DynamoDB with #USER sortKey', async () => {
      ddbMock.on(PutCommand).resolves({})

      const user = new User()
      const result = await user.createUser('user1', {
        email: 'test@example.com',
        name: 'Test User',
      } as any)

      expect(result.email).toBe('test@example.com')
      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(1)
      expect(putCalls[0].args[0].input.Item).toEqual({
        userId: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        sortKey: '#USER',
        createdAt: expect.any(String),
      })
    })

    it('does not create any infrastructure resources', async () => {
      ddbMock.on(PutCommand).resolves({})

      const user = new User()
      await user.createUser('user1', { name: '', email: '' } as any)

      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(1)
    })

    it('throws on DynamoDB error', async () => {
      ddbMock.on(PutCommand).rejects(new Error('DDB failure'))

      const user = new User()
      await expect(user.createUser('user1', {} as any)).rejects.toThrow(
        'DDB failure'
      )
    })
  })

  describe('getContent', () => {
    it('returns only fresh content (seenAt absent)', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { contentId: 'c1', header: 'Fresh', sortKey: '#CONTENT#c1' },
          {
            contentId: 'c2',
            header: 'Seen',
            seenAt: '2026-01-01',
            sortKey: '#CONTENT#c2',
          },
          { contentId: 'c3', header: 'Also Fresh', sortKey: '#CONTENT#c3' },
        ],
      })

      const user = new User()
      const result = await user.getContent('user1')

      expect(result).toHaveLength(2)
      expect(result[0].contentId).toBe('c1')
      expect(result[1].contentId).toBe('c3')
    })

    it('returns empty array when no content exists', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] })

      const user = new User()
      const result = await user.getContent('user1')

      expect(result).toEqual([])
    })

    it('returns empty array when all content is seen', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { contentId: 'c1', seenAt: '2026-01-01', sortKey: '#CONTENT#c1' },
        ],
      })

      const user = new User()
      const result = await user.getContent('user1')

      expect(result).toEqual([])
    })
  })

  describe('reactToContent', () => {
    it('updates content record with seenAt and reaction', async () => {
      ddbMock.on(UpdateCommand).resolves({})

      const user = new User()
      await user.reactToContent('user1', 'c1', 'like')

      const updateCalls = ddbMock.commandCalls(UpdateCommand)
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0].args[0].input.Key).toEqual({
        userId: 'user1',
        sortKey: '#CONTENT#c1',
      })
    })
  })

  describe('publishContent', () => {
    it('writes new content to DynamoDB', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] })
      ddbMock.on(PutCommand).resolves({})

      const user = new User()
      const result = await user.publishContent('user1', [
        {
          contentId: 'c1',
          header: 'News',
          date: '2026-01-01',
          author: { name: 'Test' },
        } as any,
      ])

      expect(result.published).toBe(1)
      expect(result.total).toBe(1)

      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(1)
      expect(putCalls[0].args[0].input.Item?.contentId).toBe('c1')
      expect(putCalls[0].args[0].input.Item?.publishedAt).toBeDefined()
      expect(putCalls[0].args[0].input.Item?.ttl).toBeDefined()
    })

    it('filters out already-existing content', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ contentId: 'c1', sortKey: '#CONTENT#c1' }],
      })
      ddbMock.on(PutCommand).resolves({})

      const user = new User()
      const result = await user.publishContent('user1', [
        { contentId: 'c1', header: 'Old' } as any,
        {
          contentId: 'c2',
          header: 'New',
          date: '2026-01-01',
          author: { name: 'Test' },
        } as any,
      ])

      expect(result.published).toBe(1)
      expect(result.total).toBe(2)

      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(1)
      expect(putCalls[0].args[0].input.Item?.contentId).toBe('c2')
    })

    it('does not write when all content already exists', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ contentId: 'c1', sortKey: '#CONTENT#c1' }],
      })

      const user = new User()
      const result = await user.publishContent('user1', [
        { contentId: 'c1', header: 'Old' } as any,
      ])

      expect(result.published).toBe(0)
      expect(result.total).toBe(1)

      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(0)
    })

    it('respects CONTENT_BATCH_LIMIT', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] })
      ddbMock.on(PutCommand).resolves({})

      const items = Array.from({ length: 15 }, (_, i) => ({
        contentId: `c${i}`,
        header: `News ${i}`,
        date: '2026-01-01',
        author: { name: 'Test' },
      }))

      const user = new User()
      const result = await user.publishContent('user1', items as any)

      expect(result.published).toBe(10)
      expect(result.total).toBe(15)
    })
  })

  describe('deleteUser', () => {
    it('calls Auth0 deletion BEFORE DynamoDB cleanup', async () => {
      const callOrder: string[] = []

      mockedAxios.post.mockImplementation(async () => {
        callOrder.push('auth0-token')
        return { data: { access_token: 'token' } }
      })
      mockedAxios.delete.mockImplementation(async () => {
        callOrder.push('auth0-delete')
        return { data: {} }
      })

      ddbMock.on(QueryCommand).callsFake(() => {
        callOrder.push('query-bots')
        return { Items: [] }
      })
      ddbMock.on(BatchWriteCommand).callsFake(() => {
        callOrder.push('batch-delete')
        return {}
      })

      const user = new User()
      await user.deleteUser('user1')

      expect(callOrder[0]).toBe('auth0-token')
      expect(callOrder[1]).toBe('auth0-delete')
      expect(callOrder.indexOf('auth0-delete')).toBeLessThan(
        callOrder.indexOf('query-bots')
      )
    })

    it('does NOT delete DynamoDB data if Auth0 deletion fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Auth0 unavailable'))

      const user = new User()
      await expect(user.deleteUser('user1')).rejects.toThrow()

      const queryCalls = ddbMock.commandCalls(QueryCommand)
      expect(queryCalls).toHaveLength(0)
    })

    it('deletes all bots before wiping DynamoDB records', async () => {
      const callOrder: string[] = []

      mockedAxios.post.mockResolvedValue({
        data: { access_token: 'token' },
      })
      mockedAxios.delete.mockResolvedValue({ data: {} })

      const BotMock = jest.requireMock('@/controllers/bot').default
      BotMock.mockImplementation(() => ({
        deleteBot: jest.fn().mockImplementation(async () => {
          callOrder.push('deleteBot')
        }),
      }))

      ddbMock.on(QueryCommand).resolves({
        Items: [
          { botId: 'bot1', sortKey: '#BOT#bot1' },
          { botId: 'bot2', sortKey: '#BOT#bot2' },
        ],
      })
      ddbMock.on(BatchWriteCommand).callsFake(() => {
        callOrder.push('batch-delete')
        return {}
      })

      const user = new User()
      await user.deleteUser('user1')

      expect(callOrder.filter((c) => c === 'deleteBot')).toHaveLength(2)
      expect(callOrder.indexOf('deleteBot')).toBeLessThan(
        callOrder.indexOf('batch-delete')
      )
    })
  })
})
