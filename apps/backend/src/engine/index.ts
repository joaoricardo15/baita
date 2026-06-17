import { Scheduler } from '@aws-sdk/client-scheduler'
import { DataType, IBot, ITaskLog } from '@baita/shared'

import Data from '@/controllers/data'

import { runBot } from './run'

const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''
const BOT_ENGINE_ARN = process.env.BOT_ENGINE_ARN || ''
const BOT_SCHEDULER_ROLE = process.env.BOT_SCHEDULER_ROLE || ''

interface IResumeData {
  startStep: number
  taskOutputs: (DataType | null)[]
  logs: ITaskLog[]
  usage: number
}

interface IEngineEvent {
  botId: string
  userId: string
  payload?: DataType
  resumeData?: IResumeData
}

export const handler = async (event: IEngineEvent) => {
  const { botId, userId, payload, resumeData } = event

  if (!botId || !userId) {
    return { success: false, error: 'Missing botId or userId' }
  }

  const data = new Data(userId, 'bot')
  const bot = (await data.read(botId)) as IBot | undefined

  if (!bot) {
    return { success: false, error: 'Bot not found' }
  }

  if (!bot.active) {
    return { success: true, message: 'Bot is inactive — skipping execution' }
  }

  if (resumeData && resumeData.startStep >= bot.tasks.length) {
    console.error(
      JSON.stringify({
        error: 'Bot was modified during wait — resume step out of bounds',
        botId,
        userId,
        startStep: resumeData.startStep,
        taskCount: bot.tasks.length,
      })
    )
    return { success: false, error: 'Bot modified during wait — aborting' }
  }

  const result = await runBot({
    userId,
    botId,
    tasks: bot.tasks,
    payload: payload ?? {},
    ...(resumeData && {
      startStep: resumeData.startStep,
      initialTaskOutputs: resumeData.taskOutputs,
      initialLogs: resumeData.logs,
      initialUsage: resumeData.usage,
    }),
  })

  if (
    result.paused &&
    result.pauseStep !== undefined &&
    result.pauseDelayMinutes !== undefined
  ) {
    console.info(
      JSON.stringify({
        logs: result.logs,
        usage: result.usage,
        botId,
        userId,
        timestamp: Date.now(),
        paused: true,
        resumeStep: result.pauseStep,
        resumeDelayMinutes: result.pauseDelayMinutes,
      })
    )

    const resumePayload = JSON.stringify({
      botId,
      userId,
      resumeData: {
        startStep: result.pauseStep,
        taskOutputs: result.taskOutputs,
        logs: result.logs,
        usage: result.usage,
      },
    })

    if (resumePayload.length > 200_000) {
      console.error(
        JSON.stringify({
          error: 'Resume payload exceeds 200KB — cannot schedule resume',
          botId,
          userId,
          payloadSize: resumePayload.length,
        })
      )
      return { success: false, error: 'Resume payload too large' }
    }

    try {
      const scheduler = new Scheduler({})
      const resumeAt = new Date(
        Date.now() + result.pauseDelayMinutes * 60 * 1000
      )
      const expression = `at(${resumeAt.toISOString().replace(/\.\d{3}Z$/, '')})`
      const groupName = `${SERVICE_PREFIX}-bot-${botId}`

      await scheduler.createSchedule({
        Name: `${groupName}-wait-${Date.now()}`,
        GroupName: groupName,
        ScheduleExpression: expression,
        FlexibleTimeWindow: { Mode: 'OFF' },
        ActionAfterCompletion: 'DELETE',
        Target: {
          Arn: BOT_ENGINE_ARN,
          RoleArn: BOT_SCHEDULER_ROLE,
          Input: resumePayload,
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(
        JSON.stringify({
          error: 'Failed to create wait schedule',
          botId,
          userId,
          message,
        })
      )
      return { success: false, error: `Wait schedule failed: ${message}` }
    }

    return { success: true, paused: true }
  }

  console.info(
    JSON.stringify({
      logs: result.logs,
      usage: result.usage,
      botId,
      userId,
      timestamp: Date.now(),
    })
  )

  return { success: result.success, data: result.data }
}
