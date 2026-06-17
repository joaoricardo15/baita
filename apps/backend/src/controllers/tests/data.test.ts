process.env.CORE_TABLE = 'test-table'
process.env.FILES_BUCKET = 'test-files-bucket'

import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  DeleteCommand,
  DynamoDBDocument,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'

const ddbMock = mockClient(DynamoDBDocument)
const s3Mock = mockClient(S3Client)

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com'),
}))

import Data from '../data'

const TEST_USER = 'user-123'
const TEST_RESOURCE = 'feeling'

beforeEach(() => {
  ddbMock.reset()
  s3Mock.reset()
})

// Journey: To-Do, Feelings, Places, Connections — generic CRUD operations for all resource types
describe('Resource', () => {
  describe('sortKey', () => {
    it('generates sort key without resourceId', () => {
      const resource = new Data(TEST_USER, TEST_RESOURCE)
      expect(resource.sortKey()).toBe('#FEELING')
    })

    it('generates sort key with resourceId', () => {
      const resource = new Data(TEST_USER, TEST_RESOURCE)
      expect(resource.sortKey('abc-123')).toBe('#FEELING#abc-123')
    })

    it('uppercases the resource name', () => {
      const resource = new Data(TEST_USER, 'todo')
      expect(resource.sortKey()).toBe('#TODO')
    })
  })

  describe('list', () => {
    it('queries DynamoDB with correct params', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { userId: TEST_USER, sortKey: '#FEELING#1', title: 'Feeling 1' },
          { userId: TEST_USER, sortKey: '#FEELING#2', title: 'Feeling 2' },
        ],
      })

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      const result = await resource.list()

      expect(result).toHaveLength(2)
      expect(result![0].title).toBe('Feeling 1')
    })

    it('returns empty array when no items found', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] })

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      const result = await resource.list()

      expect(result).toHaveLength(0)
    })

    it('throws on DynamoDB error', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'))

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      await expect(resource.list()).rejects.toThrow('DynamoDB error')
    })
  })

  describe('read', () => {
    it('gets item by userId and sortKey', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          userId: TEST_USER,
          sortKey: '#FEELING#abc',
          title: 'My Feeling',
        },
      })

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      const result = await resource.read('abc')

      expect(result).toEqual({
        userId: TEST_USER,
        sortKey: '#FEELING#abc',
        title: 'My Feeling',
      })
    })

    it('returns undefined when item not found', async () => {
      ddbMock.on(GetCommand).resolves({})

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      const result = await resource.read('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('create', () => {
    it('puts item with correct sortKey', async () => {
      ddbMock.on(PutCommand).resolves({})

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      await resource.create('feeling-1', { content: 'New Feeling' })

      const calls = ddbMock.commandCalls(PutCommand)
      expect(calls).toHaveLength(1)
      expect(calls[0].args[0].input).toEqual({
        TableName: 'test-table',
        Item: {
          userId: TEST_USER,
          sortKey: '#FEELING#feeling-1',
          content: 'New Feeling',
        },
      })
    })
  })

  describe('update', () => {
    it('generates dynamic UpdateExpression from resource keys', async () => {
      ddbMock.on(UpdateCommand).resolves({})

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      await resource.update('feeling-1', { content: 'Updated' })

      const calls = ddbMock.commandCalls(UpdateCommand)
      expect(calls).toHaveLength(1)
      const input = calls[0].args[0].input
      expect(input.Key).toEqual({
        userId: TEST_USER,
        sortKey: '#FEELING#feeling-1',
      })
      expect(input.UpdateExpression).toBe('SET #field0 = :value0')
      expect(input.ExpressionAttributeNames).toEqual({
        '#field0': 'content',
      })
      expect(input.ExpressionAttributeValues).toEqual({
        ':value0': 'Updated',
      })
    })
  })

  describe('delete', () => {
    it('deletes item with correct key', async () => {
      ddbMock.on(DeleteCommand).resolves({})

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      await resource.delete('feeling-1')

      const calls = ddbMock.commandCalls(DeleteCommand)
      expect(calls).toHaveLength(1)
      expect(calls[0].args[0].input.Key).toEqual({
        userId: TEST_USER,
        sortKey: '#FEELING#feeling-1',
      })
    })
  })

  describe('upload', () => {
    it('returns signed URL for file upload', async () => {
      const resource = new Data(TEST_USER, TEST_RESOURCE)
      const url = await resource.upload('image-123.png')

      expect(url).toBe('https://signed-url.example.com')
    })
  })

  describe('remove', () => {
    it('sends DeleteObject command to S3', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({})

      const resource = new Data(TEST_USER, TEST_RESOURCE)
      await resource.remove('image-123.png')

      const calls = s3Mock.commandCalls(DeleteObjectCommand)
      expect(calls).toHaveLength(1)
      expect(calls[0].args[0].input).toEqual({
        Bucket: 'test-files-bucket',
        Key: 'image-123.png',
      })
    })
  })
})
