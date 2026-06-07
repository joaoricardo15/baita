import {
  DataType,
  ITask,
  ITaskExecutionResult,
  TaskExecutionStatus,
} from '@baita/shared'

import { executeTask } from '@/tasks/executor'
import Api from '@/utils/api'
import { getDataFromService } from '@/utils/bot'

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
      const api = new Api({}, {
        getRemainingTimeInMillis: () => 30000,
      } as never)
      return {
        inputData,
        outputData: api.parseError(err),
        status: TaskExecutionStatus.fail,
        timestamp: Date.now(),
      }
    }
  }
}

export default Task
