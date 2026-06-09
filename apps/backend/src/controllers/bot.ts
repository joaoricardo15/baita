import { ApiGatewayV2 } from '@aws-sdk/client-apigatewayv2'
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'
import { Lambda } from '@aws-sdk/client-lambda'
import { S3 } from '@aws-sdk/client-s3'
import { Scheduler } from '@aws-sdk/client-scheduler'
import {
  IBot,
  IBotModel,
  ITask,
  ITaskExecutionResult,
  ServiceName,
  validateTaskExecutionResult,
} from '@baita/shared'
import { v4 as uuidv4 } from 'uuid'

import Task from '@/controllers/task'
import { getBotSampleCode, getCodeFile, getCompleteBotCode } from '@/utils/code'
import {
  DISABLED_SCHEDULE_EXPRESSION,
  LOG_LOOKBACK_DAYS,
  LOG_QUERY_LIMIT,
} from '@/utils/constants'

import Data from './data'

const BOTS_BUCKET = process.env.BOTS_BUCKET || ''
const BOTS_PERMISSION = process.env.BOTS_PERMISSION || ''
const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''

class Bot {
  private lambda: Lambda
  private s3: S3
  private scheduler: Scheduler
  private apigateway: ApiGatewayV2
  private cloudWatchLogs: CloudWatchLogs

  constructor() {
    this.lambda = new Lambda({})
    this.s3 = new S3({})
    this.scheduler = new Scheduler({})
    this.apigateway = new ApiGatewayV2({})
    this.cloudWatchLogs = new CloudWatchLogs({})
  }

  async getBotLogs(botId: string, searchTerms: string | string[] | undefined) {
    try {
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

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
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`
      const tags = { 'bot-id': botId, 'user-id': userId, 'managed-by': 'baita' }

      const sampleCode = getBotSampleCode(userId, botId)
      const codeFile = await getCodeFile(sampleCode)

      await this.s3.putObject({
        Bucket: BOTS_BUCKET,
        Key: `${botId}.zip`,
        Body: codeFile,
      })

      const lambdaResult = await this.lambda.createFunction({
        FunctionName: botPrefix,
        Handler: 'index.handler',
        Runtime: 'nodejs20.x',
        Timeout: 300,
        Role: BOTS_PERMISSION,
        Tags: tags,
        Code: {
          S3Bucket: BOTS_BUCKET,
          S3Key: `${botId}.zip`,
        },
      })

      const botUrl = '/bot'

      const apiResult = await this.apigateway.createApi({
        Name: botPrefix,
        ProtocolType: 'HTTP',
        CredentialsArn: BOTS_PERMISSION,
        RouteKey: `ANY ${botUrl}`,
        Target: lambdaResult.FunctionArn,
        Tags: tags,
        CorsConfiguration: {
          AllowHeaders: ['*'],
          AllowOrigins: ['*'],
          AllowMethods: ['*'],
        },
      })

      await this.scheduler.createScheduleGroup({
        Name: botPrefix,
        Tags: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      })

      await this.scheduler.createSchedule({
        Name: botPrefix,
        GroupName: botPrefix,
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

      const dataStore = new Data(userId, 'bot')
      await dataStore.create(botId, bot)

      return bot
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deployBotModel(userId: string, model: IBotModel) {
    try {
      const botId = uuidv4()
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`
      const tags = { 'bot-id': botId, 'user-id': userId, 'managed-by': 'baita' }

      const sampleCode = getCompleteBotCode(userId, botId, model.tasks)
      const codeFile = await getCodeFile(sampleCode)

      await this.s3.putObject({
        Bucket: BOTS_BUCKET,
        Key: `${botId}.zip`,
        Body: codeFile,
      })

      const lambdaResult = await this.lambda.createFunction({
        FunctionName: botPrefix,
        Handler: 'index.handler',
        Runtime: 'nodejs20.x',
        Timeout: 300,
        Role: BOTS_PERMISSION,
        Tags: tags,
        Code: {
          S3Bucket: BOTS_BUCKET,
          S3Key: `${botId}.zip`,
        },
      })

      const botUrl = '/bot'

      const apiResult = await this.apigateway.createApi({
        Name: botPrefix,
        ProtocolType: 'HTTP',
        CredentialsArn: BOTS_PERMISSION,
        RouteKey: `ANY ${botUrl}`,
        Target: lambdaResult.FunctionArn,
        Tags: tags,
        CorsConfiguration: {
          AllowHeaders: ['*'],
          AllowOrigins: ['*'],
          AllowMethods: ['*'],
        },
      })

      await this.scheduler.createScheduleGroup({
        Name: botPrefix,
        Tags: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      })

      if (model.tasks[0].service?.name === ServiceName.schedule) {
        await this.scheduler.createSchedule({
          Name: botPrefix,
          GroupName: botPrefix,
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
        await this.scheduler.createSchedule({
          Name: botPrefix,
          GroupName: botPrefix,
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

      const dataStore = new Data(userId, 'bot')
      await dataStore.create(botId, bot)

      return bot
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deleteBot(userId: string, botId: string, apiId: string) {
    try {
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

      const dataStore = new Data(userId, 'bot')
      await dataStore.delete(botId)

      const results = await Promise.allSettled([
        this.apigateway.deleteApi({ ApiId: apiId }),
        this.scheduler.deleteScheduleGroup({ Name: botPrefix }),
        this.lambda.deleteFunction({ FunctionName: botPrefix }),
        this.cloudWatchLogs.deleteLogGroup({
          logGroupName: `/aws/lambda/${botPrefix}`,
        }),
        this.s3.deleteObject({ Bucket: BOTS_BUCKET, Key: `${botId}.zip` }),
      ])

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`deleteBot step ${i} failed for ${botId}:`, r.reason)
        }
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
      const dataStore = new Data(userId, 'bot')
      const result = await dataStore.update(botId, {
        name,
        image: image || '',
        description: description || '',
        tasks,
        active,
      })

      return result
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
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

      const botCode = !active
        ? getBotSampleCode(userId, botId)
        : getCompleteBotCode(userId, botId, tasks)
      const codeFile = await getCodeFile(botCode)

      await this.s3.putObject({
        Bucket: BOTS_BUCKET,
        Key: `${botId}.zip`,
        Body: codeFile,
      })

      const lambdaResult = await this.lambda.updateFunctionCode({
        FunctionName: botPrefix,
        S3Bucket: BOTS_BUCKET,
        S3Key: `${botId}.zip`,
      })

      if (active && tasks[0].service?.name === ServiceName.schedule) {
        await this.scheduler.updateSchedule({
          Name: botPrefix,
          GroupName: botPrefix,
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
          GroupName: botPrefix,
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

      const dataStore = new Data(userId, 'bot')
      const dbResult = await dataStore.update(botId, { name, tasks, active })

      return dbResult
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async testBot(userId: string, botId: string, task: ITask, taskIndex: string) {
    try {
      let sample: ITaskExecutionResult

      if (Number(taskIndex) === 0) {
        const dataStore = new Data(userId, 'bot')
        const botData = await dataStore.read(botId)
        if (!botData?.triggerSamples) return
        sample = botData.triggerSamples.reverse()[0]
      } else {
        const taskController = new Task()
        sample = await taskController.execute(userId, task)
      }

      validateTaskExecutionResult(sample)

      const dataStore = new Data(userId, 'bot')
      await dataStore.updateNested(
        botId,
        `SET tasks[${taskIndex}].sampleResult = :sample`,
        {},
        { ':sample': sample }
      )

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
      const dataStore = new Data(userId, 'bot')
      await dataStore.appendToList(botId, 'triggerSamples', [sample])
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
      const dataStore = new Data(userId, 'bot')
      await dataStore.updateNested(
        botId,
        `SET tasks[${taskIndex}].connectionId = :connectionId`,
        {},
        { ':connectionId': connectionId }
      )
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }
}

export default Bot
