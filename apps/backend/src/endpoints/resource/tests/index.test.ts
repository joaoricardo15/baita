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
import { invokeHandler } from 'src/utils/tests/helpers/event'

const ddbMock = mockClient(DynamoDBDocument)
const s3Mock = mockClient(S3Client)

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com'),
}))

const { handler } = require('../index')

beforeEach(() => {
  ddbMock.reset()
  s3Mock.reset()
})

describe('Resource Endpoint', () => {
  describe('list operation', () => {
    it('returns list of resources', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { userId: 'user-1', sortKey: '#NOTE#1', title: 'Note 1' },
          { userId: 'user-1', sortKey: '#NOTE#2', title: 'Note 2' },
        ],
      })

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'list',
        },
      })

      expect(result.body.success).toBe(true)
      expect(result.body.data).toHaveLength(2)
    })
  })

  describe('read operation', () => {
    it('returns single resource by id', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: { userId: 'user-1', sortKey: '#NOTE#abc', title: 'My Note' },
      })

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'read',
          resourceId: 'abc',
        },
      })

      expect(result.body.success).toBe(true)
      expect(result.body.data.title).toBe('My Note')
    })
  })

  describe('create operation', () => {
    it('creates resource and returns success', async () => {
      ddbMock.on(PutCommand).resolves({})

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'create',
          resourceId: 'note-1',
        },
        body: JSON.stringify({ title: 'New Note', body: 'Content' }),
      })

      expect(result.body.success).toBe(true)
      const putCalls = ddbMock.commandCalls(PutCommand)
      expect(putCalls).toHaveLength(1)
    })
  })

  describe('update operation', () => {
    it('updates resource fields', async () => {
      ddbMock.on(UpdateCommand).resolves({})

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'update',
          resourceId: 'note-1',
        },
        body: JSON.stringify({ title: 'Updated' }),
      })

      expect(result.body.success).toBe(true)
    })
  })

  describe('delete operation', () => {
    it('deletes resource by id', async () => {
      ddbMock.on(DeleteCommand).resolves({})

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'delete',
          resourceId: 'note-1',
        },
      })

      expect(result.body.success).toBe(true)
    })
  })

  describe('upload operation', () => {
    it('returns presigned upload URL', async () => {
      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'image',
          operation: 'upload',
          resourceId: 'img-123.png',
        },
      })

      expect(result.body.success).toBe(true)
      expect(result.body.data).toBe('https://signed-url.example.com')
    })
  })

  describe('remove operation', () => {
    it('removes file from S3', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({})

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'image',
          operation: 'remove',
          resourceId: 'img-123.png',
        },
      })

      expect(result.body.success).toBe(true)
    })
  })

  describe('error handling', () => {
    it('returns error for missing path parameters', async () => {
      const result = await invokeHandler(handler, {
        pathParameters: { userId: 'user-1' },
      })

      expect(result.body.success).toBe(false)
      expect(result.body.message).toContain('Missing required path parameters')
    })

    it('returns error for unsupported operation', async () => {
      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'invalid',
        },
      })

      expect(result.body.success).toBe(false)
      expect(result.body.message).toContain('Operation not supported')
    })

    it('returns error when DynamoDB fails', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('Service unavailable'))

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'list',
        },
      })

      expect(result.body.success).toBe(false)
      expect(result.body.message).toContain('Service unavailable')
    })
  })

  describe('CORS headers', () => {
    it('includes Access-Control-Allow-Origin header', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] })

      const result = await invokeHandler(handler, {
        pathParameters: {
          userId: 'user-1',
          resourceName: 'note',
          operation: 'list',
        },
      })

      expect(result.headers['Access-Control-Allow-Origin']).toBeDefined()
      expect(result.headers['Access-Control-Allow-Credentials']).toBe('true')
    })
  })
})
