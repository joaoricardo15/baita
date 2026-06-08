import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  IBotModel,
  ITodo,
  validateTasks,
  validateTodoTasks,
} from '@baita/shared'

import { ddb } from '@/lib/dynamodb'

const CORE_TABLE = process.env.CORE_TABLE || ''
const FILES_BUCKET = process.env.FILES_BUCKET || ''
const s3 = new S3Client({})

export const resourceOperations = [
  'list',
  'read',
  'delete',
  'create',
  'update',
  'upload',
  'remove',
]
export const resourceValidationProneOperations = ['create', 'update']

export const resourceValidations: Record<string, (data: unknown) => void> = {
  todo: (data: unknown) => validateTodoTasks((data as ITodo).tasks),
  model: (data: unknown) => validateTasks((data as IBotModel).tasks),
}

class Resource {
  userId: string
  resourceName: string

  constructor(userId: string, resourceName: string) {
    this.userId = userId
    this.resourceName = resourceName.toUpperCase()
  }

  sortKey(resourceId?: string): string {
    return '#' + this.resourceName + (!resourceId ? '' : '#' + resourceId)
  }

  async list() {
    try {
      const result = await ddb.query({
        TableName: CORE_TABLE,
        KeyConditionExpression:
          'userId = :userId and begins_with(sortKey, :sortKey)',
        ExpressionAttributeValues: {
          ':userId': this.userId,
          ':sortKey': this.sortKey(),
        },
      })

      return result.Items
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async read(resourceId?: string) {
    try {
      const result = await ddb.get({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(resourceId),
        },
      })

      return result.Item
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async delete(resourceId: string) {
    try {
      await ddb.delete({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(resourceId),
        },
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async create(resourceId: string, resource: Record<string, unknown>) {
    try {
      await ddb.put({
        TableName: CORE_TABLE,
        Item: {
          userId: this.userId,
          sortKey: this.sortKey(resourceId),
          ...resource,
        },
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async update(resourceId: string, resource: Record<string, unknown>) {
    try {
      const resourceKeys = Object.keys(resource)

      await ddb.update({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(resourceId),
        },
        UpdateExpression: `SET ${resourceKeys.map((_k, index) => `#field${index} = :value${index}`).join(', ')}`,
        ExpressionAttributeNames: resourceKeys.reduce(
          (accumulator, k, index) => ({
            ...accumulator,
            [`#field${index}`]: k,
          }),
          {}
        ),
        ExpressionAttributeValues: resourceKeys.reduce(
          (accumulator, k, index) => ({
            ...accumulator,
            [`:value${index}`]: resource[k],
          }),
          {}
        ),
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async upload(resourceId: string) {
    try {
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: FILES_BUCKET,
          Key: resourceId,
        })
      )

      return uploadUrl
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async remove(resourceId: string) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: FILES_BUCKET,
          Key: resourceId,
        })
      )
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }
}

export default Resource
