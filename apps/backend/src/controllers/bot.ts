import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'
import { Lambda } from '@aws-sdk/client-lambda'
import { Scheduler } from '@aws-sdk/client-scheduler'
import {
  DataType,
  generateId,
  IBot,
  IBotTemplate,
  ITask,
  ITaskExecutionResult,
  ServiceName,
  TaskExecutionStatus,
  validateBot,
  validateTaskExecutionResult,
  validateTasks,
} from '@baita/shared'

import { executeTask } from '@/engine/executor'
import { resolveTaskInputs } from '@/engine/resolver'
import { isPauseSignal } from '@/engine/run'
import {
  DISABLED_SCHEDULE_EXPRESSION,
  LOG_LOOKBACK_DAYS,
  LOG_QUERY_LIMIT,
  MAX_TRIGGER_SAMPLES,
} from '@/utils/constants'

import Data from './data'

const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''
const BOT_ENGINE_ARN = process.env.BOT_ENGINE_ARN || ''
const BOT_SCHEDULER_ROLE = process.env.BOT_SCHEDULER_ROLE || ''
const BOT_EXECUTION_LOG_GROUP = process.env.BOT_EXECUTION_LOG_GROUP || ''

class Bot {
  private scheduler: Scheduler
  private cloudWatchLogs: CloudWatchLogs
  private lambda: Lambda

  constructor() {
    this.scheduler = new Scheduler({})
    this.cloudWatchLogs = new CloudWatchLogs({})
    this.lambda = new Lambda({})
  }

  private botPrefix(botId: string) {
    return `${SERVICE_PREFIX}-bot-${botId}`
  }

  private schedulerTarget(botId: string, userId: string) {
    return {
      Arn: BOT_ENGINE_ARN,
      RoleArn: BOT_SCHEDULER_ROLE,
      Input: JSON.stringify({ botId, userId }),
    }
  }

  private getScheduleConfig(tasks: ITask[]) {
    const trigger = tasks[0]
    const isScheduled = trigger.service?.name === ServiceName.schedule

    if (isScheduled) {
      return {
        State: 'ENABLED' as const,
        ScheduleExpression: trigger.inputData.find(
          (input) => input.name === 'expression'
        )?.value as string,
        ScheduleExpressionTimezone: trigger.inputData.find(
          (input) => input.name === 'timeZone'
        )?.value as string,
      }
    }

    return {
      State: 'DISABLED' as const,
      ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
      ScheduleExpressionTimezone: undefined,
    }
  }

  private store(userId: string) {
    return new Data(userId, 'bot')
  }

  async getBot(userId: string, botId: string) {
    const bot = await this.store(userId).read(botId)
    if (!bot) throw new Error('Bot not found')
    return bot
  }

  async listBots(userId: string) {
    return await this.store(userId).list()
  }

  async triggerBot(userId: string, botId: string, payload: DataType) {
    const bot = (await this.store(userId).read(botId)) as IBot | undefined
    if (!bot) throw new Error('Bot not found')

    if (!bot.active) {
      const sample: ITaskExecutionResult = {
        status: TaskExecutionStatus.success,
        inputData: payload,
        outputData: payload,
        timestamp: Date.now(),
      }
      await this.addTriggerSample(userId, botId, sample)
      return
    }

    await this.lambda.invoke({
      FunctionName: BOT_ENGINE_ARN,
      InvocationType: 'Event',
      Payload: JSON.stringify({ botId, userId, payload }),
    })
  }

  async createBot(userId: string) {
    const botId = generateId()
    const prefix = this.botPrefix(botId)

    await this.scheduler.createScheduleGroup({
      Name: prefix,
      Tags: [
        { Key: 'bot-id', Value: botId },
        { Key: 'user-id', Value: userId },
        { Key: 'managed-by', Value: 'baita' },
      ],
    })

    await this.scheduler.createSchedule({
      Name: prefix,
      GroupName: prefix,
      State: 'DISABLED',
      ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: this.schedulerTarget(botId, userId),
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

    await this.store(userId).create(botId, bot)
    return bot
  }

  async deployBot(
    userId: string,
    botId: string,
    name: string,
    active: boolean,
    tasks: ITask[]
  ) {
    validateTasks(tasks)
    const validation = validateBot({ tasks })
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '))
    }

    const prefix = this.botPrefix(botId)
    const scheduleConfig = active
      ? this.getScheduleConfig(tasks)
      : {
          State: 'DISABLED' as const,
          ScheduleExpression: DISABLED_SCHEDULE_EXPRESSION,
          ScheduleExpressionTimezone: undefined,
        }

    await this.scheduler.updateSchedule({
      Name: prefix,
      GroupName: prefix,
      State: scheduleConfig.State,
      ScheduleExpression: scheduleConfig.ScheduleExpression,
      ScheduleExpressionTimezone: scheduleConfig.ScheduleExpressionTimezone,
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: this.schedulerTarget(botId, userId),
    })

    return await this.store(userId).update(botId, { name, tasks, active })
  }

  async deployBotTemplate(userId: string, template: IBotTemplate) {
    validateTasks(template.tasks)

    const botId = generateId()
    const prefix = this.botPrefix(botId)

    await this.scheduler.createScheduleGroup({
      Name: prefix,
      Tags: [
        { Key: 'bot-id', Value: botId },
        { Key: 'user-id', Value: userId },
        { Key: 'managed-by', Value: 'baita' },
      ],
    })

    const scheduleConfig = this.getScheduleConfig(template.tasks)

    await this.scheduler.createSchedule({
      Name: prefix,
      GroupName: prefix,
      State: scheduleConfig.State,
      ScheduleExpression: scheduleConfig.ScheduleExpression,
      ScheduleExpressionTimezone: scheduleConfig.ScheduleExpressionTimezone,
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: this.schedulerTarget(botId, userId),
    })

    const bot: IBot = {
      botId,
      active: true,
      triggerSamples: [],
      name: template.name,
      image: template.image,
      tasks: template.tasks,
      templateId: template.templateId,
      description: template.description,
    }

    await this.store(userId).create(botId, bot)
    return bot
  }

  async deleteBot(userId: string, botId: string) {
    const store = this.store(userId)
    const bot = await store.read(botId)
    if (!bot) throw new Error('Bot not found')

    await this.scheduler.deleteScheduleGroup({ Name: this.botPrefix(botId) })
    await store.delete(botId)
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
    if (tasks) validateTasks(tasks)

    return await this.store(userId).update(botId, {
      name,
      image: image || '',
      description: description || '',
      tasks,
      active,
    })
  }

  async testBot(userId: string, botId: string, task: ITask, taskIndex: string) {
    let sample: ITaskExecutionResult

    const isTrigger =
      !task.service ||
      task.service.name === ServiceName.webhook ||
      task.service.name === ServiceName.schedule ||
      task.service.name === ServiceName.phoneEvent
    if (Number(taskIndex) === 0 && isTrigger) {
      const botData = await this.store(userId).read(botId)
      const lastSample = botData?.triggerSamples?.at(-1)
      sample = lastSample ?? {
        status: TaskExecutionStatus.success,
        inputData: {},
        outputData: null,
        timestamp: Date.now(),
      }
    } else {
      const botData = (await this.store(userId).read(botId)) as IBot | undefined
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

        if (isPauseSignal(data)) {
          sample = {
            status: TaskExecutionStatus.success,
            inputData: resolvedInputData,
            outputData: {
              message: `Would wait ${data.delayMinutes} minutes`,
            },
            timestamp: Date.now(),
          }
        } else {
          sample = {
            status: TaskExecutionStatus.success,
            inputData: resolvedInputData,
            outputData: data ?? null,
            timestamp: Date.now(),
          }
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
      await this.store(userId).updateNested(
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
    const bot = (await this.store(userId).read(botId)) as IBot | undefined
    const samples = [...(bot?.triggerSamples || []), sample].slice(
      -MAX_TRIGGER_SAMPLES
    )
    await this.store(userId).update(botId, { triggerSamples: samples })
  }

  async addConnection(
    userId: string,
    botId: string,
    connectionId: string,
    taskIndex: number
  ) {
    await this.store(userId).updateNested(
      botId,
      `SET tasks[${taskIndex}].connectionId = :connectionId`,
      {},
      { ':connectionId': connectionId }
    )
  }
}

export default Bot
