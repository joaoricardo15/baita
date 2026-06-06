import { SQS } from '@aws-sdk/client-sqs'
import { IContent, IUser } from '@baita/shared'
import axios from 'axios'

import Bot from '@/controllers/bot'
import { ddb } from '@/lib/dynamodb'
import { CONTENT_BATCH_LIMIT, SQS_RETENTION_SECONDS } from '@/utils/constants'

const CORE_TABLE = process.env.CORE_TABLE || ''
const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || ''
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID || ''
const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET || ''

class User {
  private sqs: SQS

  constructor() {
    this.sqs = new SQS({})
  }

  async createUser(user: IUser) {
    try {
      await ddb.put({
        TableName: CORE_TABLE,
        Item: {
          ...user,
          sortKey: '#USER',
        },
      })

      const dlq = await this.sqs.createQueue({
        QueueName: `${SERVICE_PREFIX}-${user.userId}-dlq`,
        Attributes: {
          MessageRetentionPeriod: (86400 * 14).toString(),
        },
      })

      const dlqAttrs = await this.sqs.getQueueAttributes({
        QueueUrl: dlq.QueueUrl!,
        AttributeNames: ['QueueArn'],
      })

      await this.sqs.createQueue({
        QueueName: `${SERVICE_PREFIX}-${user.userId}`,
        Attributes: {
          MessageRetentionPeriod: SQS_RETENTION_SECONDS.toString(),
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: dlqAttrs.Attributes!.QueueArn,
            maxReceiveCount: '3',
          }),
        },
      })

      return user
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deleteUser(userId: string) {
    try {
      const { Items: bots } = await ddb.query({
        TableName: CORE_TABLE,
        KeyConditionExpression:
          'userId = :userId and begins_with(sortKey, :sk)',
        ExpressionAttributeValues: { ':userId': userId, ':sk': '#BOT#' },
      })

      if (bots && bots.length > 0) {
        const botController = new Bot()
        for (const bot of bots) {
          try {
            const botId = bot.sortKey.replace('#BOT#', '')
            await botController.deleteBot(userId, botId, bot.apiId)
          } catch (err) {
            console.error(`Failed to delete bot ${bot.sortKey}:`, err)
          }
        }
      }

      try {
        const mainQueue = await this.sqs.getQueueUrl({
          QueueName: `${SERVICE_PREFIX}-${userId}`,
        })
        await this.sqs.deleteQueue({ QueueUrl: mainQueue.QueueUrl! })
      } catch (err) {
        console.error('Failed to delete main queue:', err)
      }

      try {
        const dlq = await this.sqs.getQueueUrl({
          QueueName: `${SERVICE_PREFIX}-${userId}-dlq`,
        })
        await this.sqs.deleteQueue({ QueueUrl: dlq.QueueUrl! })
      } catch (err) {
        console.error('Failed to delete DLQ:', err)
      }

      const { Items: allRecords } = await ddb.query({
        TableName: CORE_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      })

      if (allRecords && allRecords.length > 0) {
        const chunks = this.chunkArray(allRecords, 25)
        for (const chunk of chunks) {
          await ddb.batchWrite({
            RequestItems: {
              [CORE_TABLE]: chunk.map((item) => ({
                DeleteRequest: {
                  Key: { userId: item.userId, sortKey: item.sortKey },
                },
              })),
            },
          })
        }
      }

      await this.deleteAuth0User(userId)
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  private async deleteAuth0User(userId: string) {
    try {
      const tokenResponse = await axios.post(
        `https://${AUTH0_DOMAIN}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: AUTH0_M2M_CLIENT_ID,
          client_secret: AUTH0_M2M_CLIENT_SECRET,
          audience: `https://${AUTH0_DOMAIN}/api/v2/`,
        }
      )

      await axios.delete(
        `https://${AUTH0_DOMAIN}/api/v2/users/auth0|${userId}`,
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        }
      )
    } catch (err) {
      console.error('Failed to delete Auth0 user:', err)
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  async getContent(userId: string) {
    try {
      const queueUrlResult = await this.sqs.getQueueUrl({
        QueueName: `${SERVICE_PREFIX}-${userId}`,
      })

      const messagesResult = await this.sqs.receiveMessage({
        QueueUrl: queueUrlResult.QueueUrl,
        MaxNumberOfMessages: 10,
      })

      if (!messagesResult.Messages) {
        return []
      }

      await this.sqs.deleteMessageBatch({
        QueueUrl: queueUrlResult.QueueUrl,
        Entries: messagesResult.Messages?.map((message) => ({
          Id: message.MessageId,
          ReceiptHandle: message.ReceiptHandle,
        })),
      })

      return messagesResult.Messages.map((message) => {
        if (message.Body) {
          try {
            return JSON.parse(message.Body)
          } catch {
            return null
          }
        }
      }).filter((message) => message)
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async publishContent(
    userId: string,
    content: IContent[]
  ): Promise<{ published: number; total: number }> {
    try {
      const queueResult = await this.sqs.getQueueUrl({
        QueueName: `${SERVICE_PREFIX}-${userId}`,
      })

      const { Items: alreadySeen } = await ddb.query({
        TableName: CORE_TABLE,
        KeyConditionExpression:
          'userId = :userId and begins_with(sortKey, :sortKey)',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':sortKey': '#CONTENT',
        },
      })

      const newContent = !alreadySeen
        ? content.slice(0, CONTENT_BATCH_LIMIT)
        : content
            .filter(
              ({ contentId }) =>
                !alreadySeen.map((c) => c.contentId).includes(contentId)
            )
            .slice(0, CONTENT_BATCH_LIMIT)

      if (newContent.length > 0) {
        await this.sqs.sendMessageBatch({
          QueueUrl: queueResult.QueueUrl,
          Entries: newContent.map((entry, index) => ({
            Id: index.toString(),
            MessageBody: JSON.stringify(entry),
          })),
        })
      }

      return { published: newContent.length, total: content.length }
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }
}

export default User
