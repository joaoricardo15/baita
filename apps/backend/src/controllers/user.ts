import { SQS } from '@aws-sdk/client-sqs'
import { IContent, IUser } from '@baita/shared'
import axios from 'axios'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import { CONTENT_BATCH_LIMIT, SQS_RETENTION_SECONDS } from '@/utils/constants'

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
      const dataStore = new Data(user.userId, 'user')
      await dataStore.create('', user)

      await this.sqs.createQueue({
        QueueName: `${SERVICE_PREFIX}-user-${user.userId}`,
        Attributes: {
          MessageRetentionPeriod: SQS_RETENTION_SECONDS.toString(),
        },
        tags: { 'user-id': user.userId, 'managed-by': 'baita' },
      })

      return user
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deleteUser(userId: string) {
    try {
      const botStore = new Data(userId, 'bot')
      const bots = await botStore.list()

      if (bots && bots.length > 0) {
        const botController = new Bot()
        for (const bot of bots) {
          try {
            await botController.deleteBot(
              userId,
              bot.botId as string,
              bot.apiId as string
            )
          } catch (err) {
            console.error(`Failed to delete bot ${bot.botId}:`, err)
          }
        }
      }
    } catch (err) {
      console.error('Failed to query/delete bots:', err)
    }

    try {
      const mainQueue = await this.sqs.getQueueUrl({
        QueueName: `${SERVICE_PREFIX}-user-${userId}`,
      })
      await this.sqs.deleteQueue({ QueueUrl: mainQueue.QueueUrl! })
    } catch (err) {
      console.error('Failed to delete main queue:', err)
    }

    try {
      const dataStore = new Data(userId, '')
      await dataStore.deleteAllForUser()
    } catch (err) {
      console.error('Failed to delete DynamoDB records:', err)
    }

    await this.deleteAuth0User(userId)
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

  async getContent(userId: string) {
    try {
      const queueUrlResult = await this.sqs.getQueueUrl({
        QueueName: `${SERVICE_PREFIX}-user-${userId}`,
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
        QueueName: `${SERVICE_PREFIX}-user-${userId}`,
      })

      const contentStore = new Data(userId, 'content')
      const alreadySeen = await contentStore.list()

      const newContent = !alreadySeen
        ? content.slice(0, CONTENT_BATCH_LIMIT)
        : content
            .filter(
              ({ contentId }) =>
                !alreadySeen
                  .map((c: Record<string, unknown>) => c.contentId)
                  .includes(contentId)
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
