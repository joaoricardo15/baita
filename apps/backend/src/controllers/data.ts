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

export const dataValidationProneOperations = ['create', 'update']

export const dataValidations: Record<string, (data: unknown) => void> = {
  todo: (data: unknown) => validateTodoTasks((data as ITodo).tasks),
  model: (data: unknown) => validateTasks((data as IBotModel).tasks),
}

class Data {
  userId: string
  typeName: string

  constructor(userId: string, typeName: string) {
    this.userId = userId
    this.typeName = typeName.toUpperCase()
  }

  sortKey(id?: string): string {
    return '#' + this.typeName + (!id ? '' : '#' + id)
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

  async read(id?: string) {
    try {
      const result = await ddb.get({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(id),
        },
      })

      return result.Item
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async delete(id: string) {
    try {
      await ddb.delete({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(id),
        },
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async create(id: string, record: Record<string, unknown>) {
    try {
      await ddb.put({
        TableName: CORE_TABLE,
        Item: {
          userId: this.userId,
          sortKey: this.sortKey(id),
          ...record,
        },
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async update(id: string, record: Record<string, unknown>) {
    try {
      const keys = Object.keys(record)

      await ddb.update({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(id),
        },
        UpdateExpression: `SET ${keys.map((_k, index) => `#field${index} = :value${index}`).join(', ')}`,
        ExpressionAttributeNames: keys.reduce(
          (accumulator, k, index) => ({
            ...accumulator,
            [`#field${index}`]: k,
          }),
          {}
        ),
        ExpressionAttributeValues: keys.reduce(
          (accumulator, k, index) => ({
            ...accumulator,
            [`:value${index}`]: record[k],
          }),
          {}
        ),
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async upload(id: string) {
    try {
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: FILES_BUCKET,
          Key: id,
        })
      )

      return uploadUrl
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async remove(id: string) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: FILES_BUCKET,
          Key: id,
        })
      )
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }
}

export default Data
