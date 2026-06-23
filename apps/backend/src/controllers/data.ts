import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getEntityConfig } from '@baita/shared'

import { ddb } from '@/lib/dynamodb'

const CORE_TABLE = process.env.CORE_TABLE || ''
const FILES_BUCKET = process.env.FILES_BUCKET || ''
const s3 = new S3Client({})

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

  validate(data: unknown): void {
    const config = getEntityConfig(this.typeName)
    if (config?.schema) {
      config.schema.parse(data)
    }
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
          createdAt: new Date().toISOString(),
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

      const result = await ddb.update({
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
        ReturnValues: 'ALL_NEW',
      })

      return result.Attributes
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async updateNested(
    id: string,
    expression: string,
    names: Record<string, string>,
    values: Record<string, unknown>
  ) {
    try {
      const result = await ddb.update({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(id),
        },
        UpdateExpression: expression,
        ExpressionAttributeNames:
          Object.keys(names).length > 0 ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })

      return result.Attributes
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async appendToList(id: string, field: string, items: unknown[]) {
    try {
      await ddb.update({
        TableName: CORE_TABLE,
        Key: {
          userId: this.userId,
          sortKey: this.sortKey(id),
        },
        UpdateExpression: `SET #field = list_append(if_not_exists(#field, :empty), :items)`,
        ExpressionAttributeNames: { '#field': field },
        ExpressionAttributeValues: {
          ':items': items,
          ':empty': [],
        },
        ReturnValues: 'ALL_NEW',
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deleteAllForUser() {
    try {
      let lastEvaluatedKey: Record<string, unknown> | undefined
      const allRecords: { userId: string; sortKey: string }[] = []

      do {
        const result = await ddb.query({
          TableName: CORE_TABLE,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': this.userId },
          ConsistentRead: true,
          ExclusiveStartKey: lastEvaluatedKey,
        })
        if (result.Items)
          allRecords.push(
            ...(result.Items as { userId: string; sortKey: string }[])
          )
        lastEvaluatedKey = result.LastEvaluatedKey as
          | Record<string, unknown>
          | undefined
      } while (lastEvaluatedKey)

      if (allRecords.length === 0) return

      const chunks: { userId: string; sortKey: string }[][] = []
      for (let i = 0; i < allRecords.length; i += 25) {
        chunks.push(allRecords.slice(i, i + 25))
      }

      for (const chunk of chunks) {
        const result = await ddb.batchWrite({
          RequestItems: {
            [CORE_TABLE]: chunk.map((item) => ({
              DeleteRequest: {
                Key: { userId: item.userId, sortKey: item.sortKey },
              },
            })),
          },
        })
        if (
          result.UnprocessedItems &&
          Object.keys(result.UnprocessedItems).length > 0
        ) {
          await ddb.batchWrite({ RequestItems: result.UnprocessedItems })
        }
      }
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
