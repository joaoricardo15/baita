import { DataType, ITask } from '@baita/shared'

import { executeTask } from '@/tasks/executor'
import { getDataFromService } from '@/utils/bot'

export interface ITaskExecuteEvent {
  userId: string
  task: ITask
  resolvedInputData?: DataType
}

export interface ITaskExecuteResult {
  success: boolean
  data?: DataType
  message?: string
}

function parseError(err: unknown): string {
  if (!err) return ''
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  return String(err)
}

export async function execute(
  event: ITaskExecuteEvent
): Promise<ITaskExecuteResult> {
  const { userId, task, resolvedInputData } = event

  const serviceName = task.service?.name || 'unknown'
  const appName = task.app?.name || 'unknown'

  console.info('[task-execute] Start', {
    userId,
    service: serviceName,
    app: appName,
  })

  const inputData =
    resolvedInputData ??
    getDataFromService(
      task.service?.config.inputFields || [],
      task.inputData || [],
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

    console.info('[task-execute] Success', { userId, service: serviceName })

    return {
      success: true,
      data: data ?? undefined,
    }
  } catch (err: unknown) {
    const message = parseError(err)
    console.error('[task-execute] Failed', {
      userId,
      service: serviceName,
      error: message,
    })
    return { success: false, message }
  }
}

export const handler = async (
  event: ITaskExecuteEvent
): Promise<ITaskExecuteResult> => {
  return execute(event)
}
