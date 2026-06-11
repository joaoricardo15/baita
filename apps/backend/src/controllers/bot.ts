import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'
import { Scheduler } from '@aws-sdk/client-scheduler'
import {
  computeTriggerToken,
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

import { resolveTaskInputs } from '@/engine/resolver'
import { executeTask } from '@/tasks/executor'
import {
  DISABLED_SCHEDULE_EXPRESSION,
  LOG_LOOKBACK_DAYS,
  LOG_QUERY_LIMIT,
} from '@/utils/constants'

import Data from './data'

const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''
const BOT_EXECUTE_ARN = process.env.BOT_EXECUTE_ARN || ''
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
    try {
      const botId = generateId()
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`
      const triggerToken = computeTriggerToken(userId)

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
          Arn: BOT_EXECUTE_ARN,
          RoleArn: BOT_SCHEDULER_ROLE,
          Input: JSON.stringify({ botId, token: triggerToken }),
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

      const dataStore = new Data(userId, 'bot')
      await dataStore.create(botId, bot)

      return bot
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
      const triggerToken = computeTriggerToken(userId)

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
            Arn: BOT_EXECUTE_ARN,
            RoleArn: BOT_SCHEDULER_ROLE,
            Input: JSON.stringify({ botId, token: triggerToken }),
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
            Arn: BOT_EXECUTE_ARN,
            RoleArn: BOT_SCHEDULER_ROLE,
            Input: JSON.stringify({ botId, token: triggerToken }),
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

  async deployBotModel(userId: string, model: IBotModel) {
    try {
      const botId = generateId()
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`
      const triggerToken = computeTriggerToken(userId)

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
            Arn: BOT_EXECUTE_ARN,
            RoleArn: BOT_SCHEDULER_ROLE,
            Input: JSON.stringify({ botId, token: triggerToken }),
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
            Arn: BOT_EXECUTE_ARN,
            RoleArn: BOT_SCHEDULER_ROLE,
            Input: JSON.stringify({ botId, token: triggerToken }),
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

      const dataStore = new Data(userId, 'bot')
      await dataStore.create(botId, bot)

      return bot
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deleteBot(userId: string, botId: string) {
    try {
      const botPrefix = `${SERVICE_PREFIX}-bot-${botId}`

      const dataStore = new Data(userId, 'bot')
      await dataStore.delete(botId)

      try {
        await this.scheduler.deleteScheduleGroup({ Name: botPrefix })
      } catch (err: unknown) {
        console.error(`deleteBot scheduler cleanup failed for ${botId}:`, err)
      }
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

  async testBot(userId: string, botId: string, task: ITask, taskIndex: string) {
    try {
      let sample: ITaskExecutionResult

      if (Number(taskIndex) === 0) {
        const dataStore = new Data(userId, 'bot')
        const botData = await dataStore.read(botId)
        if (!botData?.triggerSamples?.length) {
          throw new Error(
            'No trigger samples available — run the trigger first'
          )
        }
        sample = botData.triggerSamples.at(-1)!
      } else {
        const dataStore = new Data(userId, 'bot')
        const botData = (await dataStore.read(botId)) as IBot | undefined
        const taskOutputs: DataType[] = (botData?.tasks || []).map(
          (t) => (t.sampleResult?.outputData ?? null) as DataType
        )

        const resolvedInputData = resolveTaskInputs(
          task.service?.config?.inputFields || [],
          task.inputData || [],
          taskOutputs
        )

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
          status:
            data !== undefined
              ? TaskExecutionStatus.success
              : TaskExecutionStatus.fail,
          inputData: resolvedInputData,
          outputData: data ?? null,
          timestamp: Date.now(),
        }
      }

      validateTaskExecutionResult(sample)

      try {
        const dataStore2 = new Data(userId, 'bot')
        await dataStore2.updateNested(
          botId,
          `SET tasks[${taskIndex}].sampleResult = :sample`,
          {},
          { ':sample': sample }
        )
      } catch {
        // Task index may not exist in stored bot (e.g., standalone test)
      }

      return sample
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async getBotLogs(botId: string, searchTerms: string | string[] | undefined) {
    try {
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
