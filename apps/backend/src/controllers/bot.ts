import { ApiGatewayV2 } from '@aws-sdk/client-apigatewayv2'
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { Lambda } from '@aws-sdk/client-lambda'
import { S3 } from '@aws-sdk/client-s3'
import { Scheduler } from '@aws-sdk/client-scheduler'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import {
  IBot,
  IBotModel,
  ITask,
  ITaskExecutionResult,
  TaskExecutionStatus,
} from 'src/models/bot/interface'
import { validateTaskExecutionResult } from 'src/models/bot/schema'
import { ServiceName } from 'src/models/service/interface'
import { getDataFromService } from 'src/utils/bot'
import {
  getBotSampleCode,
  getCodeFile,
  getCompleteBotCode,
} from 'src/utils/code'
import {
  DISABLED_SCHEDULE_EXPRESSION,
  LOG_LOOKBACK_DAYS,
  LOG_QUERY_LIMIT,
} from 'src/utils/constants'
import { v4 as uuidv4 } from 'uuid'

import Resource from './resource'

const CORE_TABLE = process.env.CORE_TABLE || ''
const BOTS_BUCKET = process.env.BOTS_BUCKET || ''
const BOTS_PERMISSION = process.env.BOTS_PERMISSION || ''
const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''

class Bot {
  private ddb: DynamoDBDocument
  private lambda: Lambda
  private s3: S3
  private scheduler: Scheduler
  private apigateway: ApiGatewayV2
  private cloudWatchLogs: CloudWatchLogs

  constructor() {
    this.ddb = DynamoDBDocument.from(new DynamoDB({}), {
      marshallOptions: { removeUndefinedValues: true },
    })
    this.lambda = new Lambda({})
    this.s3 = new S3({})
    this.scheduler = new Scheduler({})
    this.apigateway = new ApiGatewayV2({})
    this.cloudWatchLogs = new CloudWatchLogs({})
  }

  async getBotLogs(botId: string, searchTerms: string | string[] | undefined) {
    try {
      const botPrefix = `${SERVICE_PREFIX}-${botId}`

      let queryString =
        'fields @message | sort @timestamp desc | filter @message like "\tINFO\t"'

      if (searchTerms) {
        if (Array.isArray(searchTerms)) {
          searchTerms.forEach(
            (term) => (queryString += ` | filter @message like /(?i)${term}/`)
          )
        } else queryString += ` | filter @message like /(?i)${searchTerms}/`
      }

      let startResponse
      try {
        startResponse = await this.cloudWatchLogs.startQuery({
          limit: LOG_QUERY_LIMIT,
          queryString,
          endTime: Date.now(),
          startTime: Date.now() - LOG_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
          logGroupName: `/aws/lambda/${botPrefix}`,
        })
      } catch (err: unknown) {
        console.error(err)
        return []
      }

      let queryResponse
      while (!queryResponse || queryResponse.status !== 'Complete') {
        await new Promise((resolve) => setTimeout(resolve, 100))

        queryResponse = await this.cloudWatchLogs.getQueryResults({
          queryId: startResponse.queryId,
        })
      }

      return queryResponse?.results?.map((result) =>
        JSON.parse(
          result
            .find((obj) => obj.field === '@message')
            ?.value?.split('\tINFO\t')[1] || '{}'
        )
      )
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async createBot(userId: string) {
    try {
      const botId = uuidv4()
      const botPrefix = `${SERVICE_PREFIX}-${botId}`

      const sampleCode = getBotSampleCode(userId, botId)
      const codeFile = await getCodeFile(sampleCode)

      await this.s3.putObject({
        Bucket: BOTS_BUCKET,
        Key: `${botPrefix}.zip`,
        Body: codeFile,
      })

      const lambdaResult = await this.lambda.createFunction({
        FunctionName: botPrefix,
        Handler: 'index.handler',
        Runtime: 'nodejs20.x',
        Timeout: 300,
        Role: BOTS_PERMISSION,
        Code: {
          S3Bucket: BOTS_BUCKET,
          S3Key: `${botPrefix}.zip`,
        },
      })

      const botUrl = '/bot'

      const apiResult = await this.apigateway.createApi({
        Name: botPrefix,
        ProtocolType: 'HTTP',
        CredentialsArn: BOTS_PERMISSION,
        RouteKey: `ANY ${botUrl}`,
        Target: lambdaResult.FunctionArn,
        CorsConfiguration: {
          AllowHeaders: ['*'],
          AllowOrigins: ['*'],
          AllowMethods: ['*'],
        },
      })

      await this.scheduler.createSchedule({
        Name: botPrefix,
        State: 'DISABLED',
        ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
        FlexibleTimeWindow: {
          Mode: 'OFF',
        },
        Target: {
          Arn: lambdaResult.FunctionArn || '',
          RoleArn: BOTS_PERMISSION,
        },
      })

      const bot: IBot = {
        botId,
        userId,
        name: '',
        description: '',
        image: '',
        active: false,
        apiId: apiResult.ApiId || '',
        triggerUrl: `${apiResult.ApiEndpoint}${botUrl}`,
        triggerSamples: [],
        tasks: [
          {
            taskId: Date.now(),
            inputData: [],
          },
        ],
      }

      await this.ddb.put({
        TableName: CORE_TABLE,
        Item: {
          ...bot,
          sortKey: `#BOT#${bot.botId}`,
        },
      })

      return bot
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deployBotModel(userId: string, model: IBotModel) {
    try {
      const botId = uuidv4()
      const botPrefix = `${SERVICE_PREFIX}-${botId}`

      const sampleCode = getCompleteBotCode(userId, botId, model.tasks)
      const codeFile = await getCodeFile(sampleCode)

      await this.s3.putObject({
        Bucket: BOTS_BUCKET,
        Key: `${botPrefix}.zip`,
        Body: codeFile,
      })

      const lambdaResult = await this.lambda.createFunction({
        FunctionName: botPrefix,
        Handler: 'index.handler',
        Runtime: 'nodejs20.x',
        Timeout: 300,
        Role: BOTS_PERMISSION,
        Code: {
          S3Bucket: BOTS_BUCKET,
          S3Key: `${botPrefix}.zip`,
        },
      })

      const botUrl = '/bot'

      const apiResult = await this.apigateway.createApi({
        Name: botPrefix,
        ProtocolType: 'HTTP',
        CredentialsArn: BOTS_PERMISSION,
        RouteKey: `ANY ${botUrl}`,
        Target: lambdaResult.FunctionArn,
        CorsConfiguration: {
          AllowHeaders: ['*'],
          AllowOrigins: ['*'],
          AllowMethods: ['*'],
        },
      })

      await this.scheduler.createSchedule({
        Name: botPrefix,
        State: 'DISABLED',
        ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
        FlexibleTimeWindow: {
          Mode: 'OFF',
        },
        Target: {
          Arn: lambdaResult.FunctionArn || '',
          RoleArn: BOTS_PERMISSION,
        },
      })

      if (model.tasks[0].service?.name === ServiceName.schedule) {
        await this.scheduler.updateSchedule({
          Name: botPrefix,
          State: 'ENABLED',
          ScheduleExpression: model.tasks[0].inputData.find(
            (input) => input.name === 'expression'
          )?.value as string,
          ScheduleExpressionTimezone: model.tasks[0].inputData.find(
            (input) => input.name === 'timeZone'
          )?.value as string,
          FlexibleTimeWindow: {
            Mode: 'OFF',
          },
          Target: {
            Arn: lambdaResult.FunctionArn || '',
            RoleArn: BOTS_PERMISSION,
          },
        })
      } else {
        await this.scheduler.updateSchedule({
          Name: botPrefix,
          State: 'DISABLED',
          ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
          FlexibleTimeWindow: {
            Mode: 'OFF',
          },
          Target: {
            Arn: lambdaResult.FunctionArn || '',
            RoleArn: BOTS_PERMISSION,
          },
        })
      }

      const bot: IBot = {
        botId,
        userId,
        active: true,
        apiId: apiResult.ApiId || '',
        triggerUrl: `${apiResult.ApiEndpoint}${botUrl}`,
        triggerSamples: [],

        name: model.name,
        image: model.image,
        tasks: model.tasks,
        modelId: model.modelId,
        description: model.description,
      }

      await this.ddb.put({
        TableName: CORE_TABLE,
        Item: {
          ...bot,
          sortKey: `#BOT#${bot.botId}`,
        },
      })

      return bot
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deleteBot(userId: string, botId: string, apiId: string) {
    try {
      const botPrefix = `${SERVICE_PREFIX}-${botId}`

      await this.ddb.delete({
        TableName: CORE_TABLE,
        Key: { userId, sortKey: `#BOT#${botId}` },
      })

      await this.apigateway.deleteApi({ ApiId: apiId })

      await this.scheduler
        .deleteSchedule({ Name: botPrefix })
        .catch((err: unknown) => console.error(err))

      await this.lambda.deleteFunction({ FunctionName: botPrefix })

      try {
        await this.cloudWatchLogs.deleteLogGroup({
          logGroupName: `/aws/lambda/${botPrefix}`,
        })
      } catch (err: unknown) {
        console.error(err)
      }

      await this.s3.deleteObject({
        Bucket: BOTS_BUCKET,
        Key: `${botPrefix}.zip`,
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async updateBot(
    userId: string,
    botId: string,
    name: string,
    image: string,
    description: string,
    active: boolean,
    tasks: ITask[]
  ) {
    try {
      const result = await this.ddb.update({
        TableName: CORE_TABLE,
        Key: { userId, sortKey: `#BOT#${botId}` },
        UpdateExpression:
          'set #name = :name, image = :image, description = :description, tasks = :tasks, active = :active',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':name': name,
          ':image': image || '',
          ':description': description || '',
          ':tasks': tasks,
          ':active': active,
        },
        ReturnValues: 'ALL_NEW',
      })

      return result.Attributes
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deployBot(
    userId: string,
    botId: string,
    name: string,
    active: boolean,
    tasks: ITask[]
  ) {
    try {
      const botPrefix = `${SERVICE_PREFIX}-${botId}`

      const botCode = !active
        ? getBotSampleCode(userId, botId)
        : getCompleteBotCode(userId, botId, tasks)
      const codeFile = await getCodeFile(botCode)

      await this.s3.putObject({
        Bucket: BOTS_BUCKET,
        Key: `${botPrefix}.zip`,
        Body: codeFile,
      })

      const lambdaResult = await this.lambda.updateFunctionCode({
        FunctionName: botPrefix,
        S3Bucket: BOTS_BUCKET,
        S3Key: `${botPrefix}.zip`,
      })

      if (active && tasks[0].service?.name === ServiceName.schedule) {
        await this.scheduler.updateSchedule({
          Name: botPrefix,
          State: 'ENABLED',
          ScheduleExpression: tasks[0].inputData.find(
            (input) => input.name === 'expression'
          )?.value as string,
          ScheduleExpressionTimezone: tasks[0].inputData.find(
            (input) => input.name === 'timeZone'
          )?.value as string,
          FlexibleTimeWindow: {
            Mode: 'OFF',
          },
          Target: {
            Arn: lambdaResult.FunctionArn || '',
            RoleArn: BOTS_PERMISSION,
          },
        })
      } else {
        await this.scheduler.updateSchedule({
          Name: botPrefix,
          State: 'DISABLED',
          ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
          FlexibleTimeWindow: {
            Mode: 'OFF',
          },
          Target: {
            Arn: lambdaResult.FunctionArn || '',
            RoleArn: BOTS_PERMISSION,
          },
        })
      }

      const dbResult = await this.ddb.update({
        TableName: CORE_TABLE,
        Key: { userId, sortKey: `#BOT#${botId}` },
        UpdateExpression: 'set #name = :name, tasks = :tasks, active = :active',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':name': name,
          ':tasks': tasks,
          ':active': active,
        },
        ReturnValues: 'ALL_NEW',
      })

      return dbResult.Attributes
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async testBot(userId: string, botId: string, task: ITask, taskIndex: string) {
    try {
      let sample: ITaskExecutionResult

      const inputData = getDataFromService(
        task.service?.config.inputFields || [],
        task.inputData,
        true
      )

      if (Number(taskIndex) === 0) {
        const resource = new Resource(userId, 'bot')
        const botData = await resource.read(botId)
        if (!botData?.triggerSamples) return
        sample = botData.triggerSamples.reverse()[0]
      } else {
        const testLambdaResult = await this.lambda.invoke({
          FunctionName: `${SERVICE_PREFIX}-task-${task.service?.name}`,
          Payload: JSON.stringify({
            botId,
            userId,
            connectionId: task.connectionId,
            appConfig: task.app?.config,
            serviceConfig: task.service?.config,
            inputData,
          }) as unknown as Uint8Array,
        })

        const testLambdaPayload = JSON.parse(
          new TextDecoder().decode(testLambdaResult.Payload),
          (_, value) => {
            return !isNaN(value) && value > Number.MAX_SAFE_INTEGER
              ? value.toString()
              : value
          }
        )

        sample = {
          inputData,
          outputData: testLambdaPayload.success
            ? testLambdaPayload.data
            : testLambdaPayload.message || null,
          status: testLambdaPayload.success
            ? TaskExecutionStatus.success
            : TaskExecutionStatus.fail,
          timestamp: Date.now(),
        }
      }

      validateTaskExecutionResult(sample)

      await this.ddb.update({
        TableName: CORE_TABLE,
        Key: { userId, sortKey: `#BOT#${botId}` },
        ReturnValues: 'ALL_NEW',
        UpdateExpression: `set tasks[${taskIndex}].sampleResult = :sample`,
        ExpressionAttributeValues: {
          ':sample': sample,
        },
      })

      return sample
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async addTriggerSample(
    userId: string,
    botId: string,
    sample: ITaskExecutionResult
  ) {
    try {
      await this.ddb.update({
        TableName: CORE_TABLE,
        Key: { userId, sortKey: `#BOT#${botId}` },
        ReturnValues: 'ALL_NEW',
        UpdateExpression:
          'set triggerSamples = list_append(if_not_exists(triggerSamples, :emptyList), :sampleList)',
        ExpressionAttributeValues: {
          ':sampleList': [sample],
          ':emptyList': [],
        },
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async addConnection(
    userId: string,
    botId: string,
    connectionId: string,
    taskIndex: number
  ) {
    try {
      await this.ddb.update({
        TableName: CORE_TABLE,
        Key: { userId, sortKey: `#BOT#${botId}` },
        UpdateExpression: `set tasks[${taskIndex}].connectionId = :connectionId`,
        ExpressionAttributeValues: {
          ':connectionId': connectionId,
        },
        ReturnValues: 'ALL_NEW',
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }
}

export default Bot
