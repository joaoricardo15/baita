import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'
import { Scheduler } from '@aws-sdk/client-scheduler'
import {
  DataType,
  generateId,
  IBot,
  IBotModel,
  ITask,
  ITaskExecutionResult,
  ServiceName,
  TaskExecutionStatus,
  validateTaskExecutionResult,
} from '@baita/shared'

import { executeTask } from '@/engine/executor'
import { resolveTaskInputs } from '@/engine/resolver'
import {
  DISABLED_SCHEDULE_EXPRESSION,
  LOG_LOOKBACK_DAYS,
  LOG_QUERY_LIMIT,
} from '@/utils/constants'

import Data from './data'

const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''
const BOT_ENGINE_ARN = process.env.BOT_ENGINE_ARN || ''
const BOT_SCHEDULER_ROLE = process.env.BOT_SCHEDULER_ROLE || ''
const BOT_EXECUTION_LOG_GROUP = process.env.BOT_EXECUTION_LOG_GROUP || ''

class Bot {
  private scheduler: Scheduler
  private cloudWatchLogs: CloudWatchLogs

  constructor() {
    this.scheduler = new Scheduler({})
    this.cloudWatchLogs = new CloudWatchLogs({})
  }

  async createBot(userId: string) {
    const botId = generateId()
    const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

    await this.scheduler.createScheduleGroup({
      Name: botPrefix,
      Tags: [
        { Key: 'bot-id', Value: botId },
        { Key: 'user-id', Value: userId },
        { Key: 'managed-by', Value: 'baita' },
      ],
    })

    await this.scheduler.createSchedule({
      Name: botPrefix,
      GroupName: botPrefix,
      State: 'DISABLED',
      ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: {
        Arn: BOT_ENGINE_ARN,
        RoleArn: BOT_SCHEDULER_ROLE,
        Input: JSON.stringify({ botId, userId }),
      },
    })

    const bot: IBot = {
      botId,
      name: '',
      description: '',
      image: '',
      active: false,
      triggerSamples: [],
      tasks: [{ taskId: Date.now(), inputData: [] }],
    }

    const store = new Data(userId, 'bot')
    await store.create(botId, bot)

    return bot
  }

  async deployBot(
    userId: string,
    botId: string,
    name: string,
    active: boolean,
    tasks: ITask[]
  ) {
    const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

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
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: BOT_ENGINE_ARN,
          RoleArn: BOT_SCHEDULER_ROLE,
          Input: JSON.stringify({ botId, userId }),
        },
      })
    } else {
      await this.scheduler.updateSchedule({
        Name: botPrefix,
        GroupName: botPrefix,
        State: 'DISABLED',
        ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: BOT_ENGINE_ARN,
          RoleArn: BOT_SCHEDULER_ROLE,
          Input: JSON.stringify({ botId, userId }),
        },
      })
    }

    const store = new Data(userId, 'bot')
    return await store.update(botId, { name, tasks, active })
  }

  async deployBotModel(userId: string, model: IBotModel) {
    const botId = generateId()
    const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

    await this.scheduler.createScheduleGroup({
      Name: botPrefix,
      Tags: [
        { Key: 'bot-id', Value: botId },
        { Key: 'user-id', Value: userId },
        { Key: 'managed-by', Value: 'baita' },
      ],
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
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: BOT_ENGINE_ARN,
          RoleArn: BOT_SCHEDULER_ROLE,
          Input: JSON.stringify({ botId, userId }),
        },
      })
    } else {
      await this.scheduler.createSchedule({
        Name: botPrefix,
        GroupName: botPrefix,
        State: 'DISABLED',
        ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: BOT_ENGINE_ARN,
          RoleArn: BOT_SCHEDULER_ROLE,
          Input: JSON.stringify({ botId, userId }),
        },
      })
    }

    const bot: IBot = {
      botId,
      active: true,
      triggerSamples: [],
      name: model.name,
      image: model.image,
      tasks: model.tasks,
      modelId: model.modelId,
      description: model.description,
    }

    const store = new Data(userId, 'bot')
    await store.create(botId, bot)

    return bot
  }

  async deleteBot(userId: string, botId: string) {
    const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

    const store = new Data(userId, 'bot')
    await store.delete(botId)

    try {
      await this.scheduler.deleteScheduleGroup({ Name: botPrefix })
    } catch (err: unknown) {
      console.error(`deleteBot scheduler cleanup failed for ${botId}:`, err)
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
    const store = new Data(userId, 'bot')
    return await store.update(botId, {
      name,
      image: image || '',
      description: description || '',
      tasks,
      active,
    })
  }

  async testBot(userId: string, botId: string, task: ITask, taskIndex: string) {
    let sample: ITaskExecutionResult

    if (Number(taskIndex) === 0 && !task.service) {
      const store = new Data(userId, 'bot')
      const botData = await store.read(botId)
      if (!botData?.triggerSamples?.length) {
        throw new Error('No trigger samples available — run the trigger first')
      }
      sample = botData.triggerSamples.at(-1)!
    } else {
      const store = new Data(userId, 'bot')
      const botData = (await store.read(botId)) as IBot | undefined
      const taskOutputs: DataType[] = (botData?.tasks || []).map(
        (t) => (t.sampleResult?.outputData ?? null) as DataType
      )

      const resolvedInputData = resolveTaskInputs(
        task.service?.config?.inputFields || [],
        task.inputData || [],
        taskOutputs
      )

      try {
        const data = await executeTask({
          botId,
          userId,
          connectionId: task.connectionId as string | undefined,
          appConfig: task.app?.config || {},
          serviceConfig: task.service?.config || {},
          inputData: resolvedInputData,
          serviceName: task.service?.name,
        })

        sample = {
          status: TaskExecutionStatus.success,
          inputData: resolvedInputData,
          outputData: data ?? null,
          timestamp: Date.now(),
        }
      } catch (err: unknown) {
        sample = {
          status: TaskExecutionStatus.fail,
          inputData: resolvedInputData,
          outputData: (err instanceof Error ? err.message : String(err)) as
            | string
            | DataType,
          timestamp: Date.now(),
        }
      }
    }

    validateTaskExecutionResult(sample)

    try {
      const store = new Data(userId, 'bot')
      await store.updateNested(
        botId,
        `SET tasks[${taskIndex}].sampleResult = :sample`,
        {},
        { ':sample': sample }
      )
    } catch {
      // Task index may not exist in stored bot (e.g., standalone test)
    }

    return sample
  }

  async getBotLogs(botId: string, searchTerms: string | string[] | undefined) {
    let queryString = `fields @message | sort @timestamp desc | filter @message like "\tINFO\t" | filter @message like "${botId}"`

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
        logGroupName: BOT_EXECUTION_LOG_GROUP,
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
  }

  async addTriggerSample(
    userId: string,
    botId: string,
    sample: ITaskExecutionResult
  ) {
    const store = new Data(userId, 'bot')
    await store.appendToList(botId, 'triggerSamples', [sample])
  }

  async addConnection(
    userId: string,
    botId: string,
    connectionId: string,
    taskIndex: number
  ) {
    const store = new Data(userId, 'bot')
    await store.updateNested(
      botId,
      `SET tasks[${taskIndex}].connectionId = :connectionId`,
      {},
      { ':connectionId': connectionId }
    )
  }
}

export default Bot
