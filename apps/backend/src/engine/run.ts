import {
  DataType,
  ITask,
  ITaskLog,
  MethodName,
  TaskExecutionStatus,
} from '@baita/shared'

import { evaluateConditions } from './conditions'
import { executeTask } from './executor'
import { resolveTaskInputs } from './resolver'

interface IPauseSignal {
  __pause: true
  delayMinutes: number
}

export function isPauseSignal(data: unknown): data is IPauseSignal {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__pause' in data &&
    (data as IPauseSignal).__pause === true
  )
}

export interface IBotExecutionParams {
  userId: string
  botId: string
  tasks: ITask[]
  payload: DataType
  startStep?: number
  initialTaskOutputs?: (DataType | null)[]
  initialLogs?: ITaskLog[]
  initialUsage?: number
}

export interface IBotExecutionResult {
  success: boolean
  data?: DataType
  logs: ITaskLog[]
  usage: number
  paused?: boolean
  pauseStep?: number
  pauseDelayMinutes?: number
  taskOutputs?: (DataType | null)[]
}

export async function runBot(
  params: IBotExecutionParams
): Promise<IBotExecutionResult> {
  const {
    userId,
    botId,
    tasks,
    payload,
    startStep = 1,
    initialTaskOutputs,
    initialLogs,
    initialUsage,
  } = params
  const taskOutputs: (DataType | null)[] = initialTaskOutputs || [payload]
  const logs: ITaskLog[] = initialLogs || []
  let usage = initialUsage || 0
  let outputData: DataType | undefined
  let hasError = false

  if (!initialTaskOutputs) {
    const triggerName = tasks[0]?.service?.name || 'trigger'
    logs.push({
      name: triggerName,
      timestamp: Date.now(),
      inputData: payload,
      outputData: payload,
      status: TaskExecutionStatus.success,
    })
  }

  for (let i = startStep; i < tasks.length; i++) {
    const task = tasks[i]
    const taskName = task.service?.label || task.service?.name || `Task ${i}`
    const startTime = Date.now()

    try {
      const conditionsPassed = evaluateConditions(task.conditions, taskOutputs)

      if (!conditionsPassed) {
        taskOutputs[i] = null
        logs.push({
          name: taskName,
          timestamp: startTime,
          inputData: {},
          outputData: {},
          status: TaskExecutionStatus.filtered,
        })
        continue
      }

      const resolvedInputData = resolveTaskInputs(
        task.service?.config?.inputFields || [],
        task.inputData || [],
        taskOutputs
      )

      const result = await executeWithRetry(
        { userId, botId, task, resolvedInputData },
        task.retryPolicy?.maxAttempts ?? 1,
        task.retryPolicy?.backoffMs ?? 1000
      )

      taskOutputs[i] = result.success ? (result.data ?? null) : null

      if (result.success) {
        const isWaitMethod =
          task.service?.config?.methodName === MethodName.wait
        if (isWaitMethod && isPauseSignal(result.data)) {
          taskOutputs[i] = null
          logs.push({
            name: taskName,
            timestamp: startTime,
            inputData: resolvedInputData,
            outputData: {
              message: `Waiting ${result.data.delayMinutes} minutes...`,
            } as DataType,
            status: TaskExecutionStatus.success,
          })
          return {
            success: true,
            logs,
            usage,
            paused: true,
            pauseStep: i + 1,
            pauseDelayMinutes: result.data.delayMinutes,
            taskOutputs,
          }
        }

        usage++
        if (task.returnData) outputData = result.data
      } else {
        hasError = true
        logs.push({
          name: taskName,
          timestamp: startTime,
          inputData: resolvedInputData,
          outputData: { message: result.message } as DataType,
          status: TaskExecutionStatus.fail,
        })
        break
      }

      logs.push({
        name: taskName,
        timestamp: startTime,
        inputData: resolvedInputData,
        outputData: result.data ?? {},
        status: TaskExecutionStatus.success,
      })
    } catch (err: unknown) {
      hasError = true
      taskOutputs[i] = null
      const message = err instanceof Error ? err.message : String(err)
      logs.push({
        name: taskName,
        timestamp: startTime,
        inputData: {},
        outputData: { message } as DataType,
        status: TaskExecutionStatus.fail,
      })
      break
    }
  }

  return {
    success: !hasError,
    data: outputData,
    logs,
    usage,
  }
}

interface IExecuteParams {
  userId: string
  botId: string
  task: ITask
  resolvedInputData: DataType
}

interface IExecuteResult {
  success: boolean
  data?: DataType
  message?: string
}

async function executeWithRetry(
  params: IExecuteParams,
  maxAttempts: number,
  backoffMs: number
): Promise<IExecuteResult> {
  const { userId, botId, task, resolvedInputData } = params
  let lastError: string | undefined

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

      return { success: true, data: data ?? undefined }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err)

      if (attempt < maxAttempts - 1) {
        await delay(backoffMs * (attempt + 1))
      }
    }
  }

  return { success: false, message: lastError }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
