import {
  DataType,
  ITask,
  ITaskExecutionResult,
  TaskExecutionStatus,
} from '@baita/shared'

import { executeTask } from '@/tasks/executor'
import { getDataFromService } from '@/utils/bot'

function parseTaskError(err: unknown): string {
  if (!err) return ''
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  return String(err)
}

class Task {
  async execute(
    userId: string,
    task: ITask,
    preResolvedInput?: DataType
  ): Promise<ITaskExecutionResult> {
    const inputData =
      preResolvedInput ??
      getDataFromService(
        task.service?.config.inputFields || [],
        task.inputData,
        true
      )

    try {
      const data = await executeTask({
        botId: 'standalone',
        userId,
        connectionId: task.connectionId as string,
        appConfig: task.app?.config || {},
        serviceConfig: task.service?.config || {},
        inputData,
        serviceName: task.service?.name,
      })
      return {
        inputData,
        outputData: data ?? null,
        status: TaskExecutionStatus.success,
        timestamp: Date.now(),
      }
    } catch (err: unknown) {
      return {
        inputData,
        outputData: parseTaskError(err),
        status: TaskExecutionStatus.fail,
        timestamp: Date.now(),
      }
    }
  }
}

export default Task
