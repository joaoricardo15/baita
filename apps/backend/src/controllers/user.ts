import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { SQS } from '@aws-sdk/client-sqs'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { IContent, IUser } from '@baita/shared'
import { CONTENT_BATCH_LIMIT, SQS_RETENTION_SECONDS } from '@/utils/constants'

const CORE_TABLE = process.env.CORE_TABLE || ''
const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''

class User {
  private sqs: SQS
  private ddb: DynamoDBDocument

  constructor() {
    this.sqs = new SQS({})
    this.ddb = DynamoDBDocument.from(new DynamoDB({}), {
      marshallOptions: { removeUndefinedValues: true },
    })
  }

  async createUser(user: IUser) {
    try {
      await this.ddb.put({
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

  async publishContent(userId: string, content: IContent[]) {
    try {
      const queueResult = await this.sqs.getQueueUrl({
        QueueName: `${SERVICE_PREFIX}-${userId}`,
      })

      const { Items: alreadySeen } = await this.ddb.query({
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
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }
}

export default User
