import {
  ITask,
  ServiceName,
  ServiceType,
  TaskExecutionStatus,
  VariableType,
} from '@baita/shared'

import { runBot } from '../run'

jest.mock('@/engine/executor', () => ({
  executeTask: jest.fn(),
}))

import { executeTask } from '@/engine/executor'

const mockExecuteTask = executeTask as jest.MockedFunction<typeof executeTask>

describe('runBot', () => {
  beforeEach(() => {
    mockExecuteTask.mockReset()
  })

  const makeTriggerTask = (): ITask => ({
    taskId: 0,
    inputData: [],
    service: {
      name: ServiceName.webhook,
      type: ServiceType.trigger,
      label: 'Webhook',
      config: {},
    },
  })

  const makeActionTask = (taskId: number): ITask => ({
    taskId,
    inputData: [],
    service: {
      name: ServiceName.method,
      type: ServiceType.invoke,
      label: 'Action',
      config: { inputFields: [] },
    },
  })

  it('executes tasks sequentially and returns logs', async () => {
    mockExecuteTask.mockResolvedValueOnce({ message: 'hello' })

    const result = await runBot({
      userId: 'user-1',
      botId: 'bot-1',
      tasks: [makeTriggerTask(), makeActionTask(1)],
      payload: { input: 'data' },
    })

    expect(result.success).toBe(true)
    expect(result.usage).toBe(1)
    expect(result.logs).toHaveLength(2)
    expect(result.logs[0].status).toBe(TaskExecutionStatus.success)
    expect(result.logs[1].status).toBe(TaskExecutionStatus.success)
  })

  it('handles task failure without crashing', async () => {
    mockExecuteTask.mockRejectedValueOnce(new Error('API timeout'))

    const result = await runBot({
      userId: 'user-1',
      botId: 'bot-1',
      tasks: [makeTriggerTask(), makeActionTask(1)],
      payload: {},
    })

    expect(result.success).toBe(false)
    expect(result.usage).toBe(0)
    expect(result.logs[1].status).toBe(TaskExecutionStatus.fail)
  })

  it('filters tasks when conditions are not met', async () => {
    const task: ITask = {
      ...makeActionTask(1),
      conditions: [
        [
          {
            operator: 'equals' as never,
            operand: {
              type: VariableType.output,
              name: 's',
              label: 'S',
              outputIndex: 0,
              outputPath: 'status',
            },
            comparisonOperand: {
              type: VariableType.text,
              name: 'v',
              label: 'V',
              value: 'will-not-match',
            },
          },
        ],
      ],
    }

    const result = await runBot({
      userId: 'user-1',
      botId: 'bot-1',
      tasks: [makeTriggerTask(), task],
      payload: { status: 'active' },
    })

    expect(result.logs[1].status).toBe(TaskExecutionStatus.filtered)
    expect(mockExecuteTask).not.toHaveBeenCalled()
  })

  it('passes output from one task to the next via resolver', async () => {
    mockExecuteTask
      .mockResolvedValueOnce({ userId: '123', email: 'a@b.com' })
      .mockResolvedValueOnce({ sent: true })

    const tasks: ITask[] = [
      makeTriggerTask(),
      makeActionTask(1),
      {
        taskId: 2,
        inputData: [
          {
            type: VariableType.output,
            name: 'to',
            label: 'To',
            outputIndex: 1,
            outputPath: 'email',
          },
        ],
        service: {
          name: ServiceName.method,
          type: ServiceType.invoke,
          label: 'Send Email',
          config: {
            inputFields: [
              {
                type: VariableType.text,
                name: 'to',
                label: 'To',
                required: true,
              },
            ],
          },
        },
      },
    ]

    const result = await runBot({
      userId: 'user-1',
      botId: 'bot-1',
      tasks,
      payload: {},
    })

    expect(result.success).toBe(true)
    expect(result.usage).toBe(2)
    expect(mockExecuteTask).toHaveBeenCalledTimes(2)
    expect(mockExecuteTask.mock.calls[1][0].inputData).toEqual({
      to: 'a@b.com',
    })
  })

  it('retries failed tasks according to retryPolicy', async () => {
    mockExecuteTask
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ ok: true })

    const task: ITask = {
      ...makeActionTask(1),
      retryPolicy: { maxAttempts: 3, backoffMs: 10 },
    }

    const result = await runBot({
      userId: 'user-1',
      botId: 'bot-1',
      tasks: [makeTriggerTask(), task],
      payload: {},
    })

    expect(result.success).toBe(true)
    expect(mockExecuteTask).toHaveBeenCalledTimes(2)
  })

  it('sets returnData output when task.returnData is true', async () => {
    mockExecuteTask.mockResolvedValueOnce({ final: 'output' })

    const task: ITask = {
      ...makeActionTask(1),
      returnData: true,
    }

    const result = await runBot({
      userId: 'user-1',
      botId: 'bot-1',
      tasks: [makeTriggerTask(), task],
      payload: {},
    })

    expect(result.data).toEqual({ final: 'output' })
  })
})
