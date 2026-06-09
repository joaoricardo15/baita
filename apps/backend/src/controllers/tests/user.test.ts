process.env.CORE_TABLE = 'test-table'
process.env.SERVICE_PREFIX = 'baita-prod'

import {
  CreateQueueCommand,
  DeleteMessageBatchCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SQS,
} from '@aws-sdk/client-sqs'
import {
  DynamoDBDocument,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'

jest.mock('@/controllers/bot', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      deleteBot: jest.fn().mockResolvedValue(undefined),
    })),
  }
})

const ddbMock = mockClient(DynamoDBDocument)
const sqsMock = mockClient(SQS)

import User from '../user'

beforeEach(() => {
  ddbMock.reset()
  sqsMock.reset()
})

// Journey: Account Management + Content Feed — user provisioning, content consumption, publishing
describe('User', () => {
  describe('createUser', () => {
    it('stores user in DynamoDB with #USER sortKey', async () => {
      ddbMock.on(PutCommand).resolves({})
      sqsMock.on(CreateQueueCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })

      const user = new User()
      const result = await user.createUser('auth0|user1', {
        email: 'test@example.com',
        name: 'Test User',
      } as any)

      expect(result.email).toBe('test@example.com')
      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(1)
      expect(putCalls[0].args[0].input.Item).toEqual({
        userId: 'auth0|user1',
        email: 'test@example.com',
        name: 'Test User',
        sortKey: '#USER',
      })
    })

    it('creates SQS queue for the user', async () => {
      ddbMock.on(PutCommand).resolves({})
      sqsMock.on(CreateQueueCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })

      const user = new User()
      await user.createUser('auth0|user1', { name: '', email: '' } as any)

      const createQueueCalls = sqsMock.commandCalls(CreateQueueCommand)
      expect(createQueueCalls).toHaveLength(1)
      expect(createQueueCalls[0].args[0].input.QueueName).toBe(
        'baita-prod-user-auth0|user1'
      )
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
    it('returns parsed messages from SQS queue', async () => {
      sqsMock.on(GetQueueUrlCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: [
          {
            MessageId: 'msg-1',
            ReceiptHandle: 'receipt-1',
            Body: JSON.stringify({ title: 'News 1', contentId: 'c1' }),
          },
          {
            MessageId: 'msg-2',
            ReceiptHandle: 'receipt-2',
            Body: JSON.stringify({ title: 'News 2', contentId: 'c2' }),
          },
        ],
      })
      sqsMock.on(DeleteMessageBatchCommand).resolves({})

      const user = new User()
      const result = await user.getContent('auth0|user1')

      expect(result).toHaveLength(2)
      expect(result![0].title).toBe('News 1')
      expect(result![1].contentId).toBe('c2')
    })

    it('returns empty array when no messages', async () => {
      sqsMock.on(GetQueueUrlCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })
      sqsMock.on(ReceiveMessageCommand).resolves({})

      const user = new User()
      const result = await user.getContent('auth0|user1')

      expect(result).toEqual([])
    })

    it('deletes messages after receiving them', async () => {
      sqsMock.on(GetQueueUrlCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: [
          { MessageId: 'msg-1', ReceiptHandle: 'receipt-1', Body: '{}' },
        ],
      })
      sqsMock.on(DeleteMessageBatchCommand).resolves({})

      const user = new User()
      await user.getContent('auth0|user1')

      const deleteCalls = sqsMock.commandCalls(DeleteMessageBatchCommand)
      expect(deleteCalls).toHaveLength(1)
      expect(deleteCalls[0].args[0].input.Entries).toEqual([
        { Id: 'msg-1', ReceiptHandle: 'receipt-1' },
      ])
    })

    it('filters out messages with invalid JSON bodies', async () => {
      sqsMock.on(GetQueueUrlCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: [
          { MessageId: 'msg-1', ReceiptHandle: 'r1', Body: 'not-json' },
          {
            MessageId: 'msg-2',
            ReceiptHandle: 'r2',
            Body: JSON.stringify({ title: 'Valid' }),
          },
        ],
      })
      sqsMock.on(DeleteMessageBatchCommand).resolves({})

      const user = new User()
      const result = await user.getContent('user1')

      expect(result).toHaveLength(1)
      expect(result![0].title).toBe('Valid')
    })
  })

  describe('publishContent', () => {
    it('sends new content to SQS queue', async () => {
      sqsMock.on(GetQueueUrlCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })
      ddbMock.on(QueryCommand).resolves({ Items: [] })
      sqsMock.on(SendMessageBatchCommand).resolves({})

      const user = new User()
      await user.publishContent('user1', [
        { contentId: 'c1', title: 'News' } as any,
      ])

      const sendCalls = sqsMock.commandCalls(SendMessageBatchCommand)
      expect(sendCalls).toHaveLength(1)
      expect(sendCalls[0].args[0].input.Entries).toHaveLength(1)
    })

    it('filters out already-seen content', async () => {
      sqsMock.on(GetQueueUrlCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })
      ddbMock.on(QueryCommand).resolves({
        Items: [{ contentId: 'c1' }],
      })
      sqsMock.on(SendMessageBatchCommand).resolves({})

      const user = new User()
      await user.publishContent('user1', [
        { contentId: 'c1', title: 'Old' } as any,
        { contentId: 'c2', title: 'New' } as any,
      ])

      const sendCalls = sqsMock.commandCalls(SendMessageBatchCommand)
      expect(sendCalls).toHaveLength(1)
      expect(sendCalls[0].args[0].input.Entries).toHaveLength(1)
      const body = JSON.parse(
        sendCalls[0].args[0].input.Entries![0].MessageBody!
      )
      expect(body.contentId).toBe('c2')
    })

    it('does not send batch when all content already seen', async () => {
      sqsMock.on(GetQueueUrlCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      })
      ddbMock.on(QueryCommand).resolves({
        Items: [{ contentId: 'c1' }],
      })

      const user = new User()
      await user.publishContent('user1', [
        { contentId: 'c1', title: 'Old' } as any,
      ])

      const sendCalls = sqsMock.commandCalls(SendMessageBatchCommand)
      expect(sendCalls).toHaveLength(0)
    })
  })
})
