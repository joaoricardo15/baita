import {
  clearDownstreamSamples,
  computeStepConfigHash,
  IBot,
  ITask,
  removeStepReferences,
  TaskExecutionStatus,
  validateBot,
} from '../schemas/bot'
import { ServiceName, ServiceType, VariableType } from '../schemas/service'

const makeTriggerTask = (taskId = 1000): ITask => ({
  taskId,
  inputData: [],
  service: {
    type: ServiceType.trigger,
    name: ServiceName.webhook,
    label: 'Webhook',
    config: {},
  },
})

const makeActionTask = (
  taskId: number,
  overrides: Partial<ITask> = {}
): ITask => ({
  taskId,
  inputData: [],
  service: {
    type: ServiceType.invoke,
    name: ServiceName.code,
    label: 'Run Code',
    config: { inputFields: [] },
  },
  ...overrides,
})

const makeBot = (tasks: ITask[]): IBot => ({
  botId: 'bot-1',
  userId: 'user-1',
  apiId: 'api-1',
  name: 'Test Bot',
  active: false,
  triggerUrl: 'https://example.com',
  triggerSamples: [],
  tasks,
})

describe('validateBot', () => {
  it('passes for a valid bot with trigger + action', () => {
    const bot = makeBot([makeTriggerTask(), makeActionTask(2000)])
    const result = validateBot(bot)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when a non-trigger task has no service', () => {
    const bot = makeBot([makeTriggerTask(), { taskId: 2000, inputData: [] }])
    const result = validateBot(bot)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('missing service')
  })

  it('fails when outputIndex references a future step', () => {
    const bot = makeBot([
      makeTriggerTask(),
      makeActionTask(2000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'data',
            label: 'Data',
            outputIndex: 2,
            outputPath: 'value',
          },
        ],
      }),
      makeActionTask(3000),
    ])
    const result = validateBot(bot)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("hasn't executed yet")
  })

  it('fails when outputIndex references self (same step)', () => {
    const bot = makeBot([
      makeTriggerTask(),
      makeActionTask(2000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'self',
            label: 'Self Ref',
            outputIndex: 1,
            outputPath: 'x',
          },
        ],
      }),
    ])
    const result = validateBot(bot)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("hasn't executed yet")
  })

  it('fails when outputIndex references non-existent step', () => {
    const bot = makeBot([
      makeTriggerTask(),
      makeActionTask(2000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'ghost',
            label: 'Ghost',
            outputIndex: 99,
            outputPath: 'x',
          },
        ],
      }),
    ])
    const result = validateBot(bot)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("hasn't executed yet")
  })

  it('passes when outputIndex references an earlier step', () => {
    const bot = makeBot([
      makeTriggerTask(),
      makeActionTask(2000, {
        sampleResult: {
          timestamp: 1,
          inputData: {},
          outputData: { value: 'hello' },
          status: TaskExecutionStatus.success,
        },
      }),
      makeActionTask(3000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'prev',
            label: 'Previous',
            outputIndex: 1,
            outputPath: 'value',
          },
        ],
      }),
    ])
    const result = validateBot(bot)
    expect(result.valid).toBe(true)
  })

  it('warns when outputPath not found in sample data', () => {
    const bot = makeBot([
      makeTriggerTask(),
      makeActionTask(2000, {
        sampleResult: {
          timestamp: 1,
          inputData: {},
          outputData: { name: 'John' },
          status: TaskExecutionStatus.success,
        },
      }),
      makeActionTask(3000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'missing',
            label: 'Missing Path',
            outputIndex: 1,
            outputPath: 'nonexistent.field',
          },
        ],
      }),
    ])
    const result = validateBot(bot)
    expect(result.valid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('not found in test data')
  })

  it('warns when sample config hash is stale', () => {
    const task = makeActionTask(2000)
    const hash = computeStepConfigHash(task)
    const staleTask: ITask = {
      ...task,
      sampleConfigHash: 'old-hash-that-no-longer-matches',
      sampleResult: {
        timestamp: 1,
        inputData: {},
        outputData: {},
        status: TaskExecutionStatus.success,
      },
    }
    const bot = makeBot([makeTriggerTask(), staleTask])
    const result = validateBot(bot)
    expect(result.valid).toBe(true)
    expect(result.warnings[0]).toContain('stale')
  })
})

describe('removeStepReferences', () => {
  it('removes the deleted task and clears references to it', () => {
    const tasks: ITask[] = [
      makeTriggerTask(1000),
      makeActionTask(2000),
      makeActionTask(3000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'ref',
            label: 'Ref',
            outputIndex: 1,
            outputPath: 'data',
          },
        ],
      }),
    ]

    const { tasks: updated, removedCount } = removeStepReferences(tasks, 2000)
    expect(updated).toHaveLength(2)
    expect(removedCount).toBe(1)
    expect(updated[1].inputData[0].outputIndex).toBeUndefined()
  })

  it('adjusts indices for steps after the deleted one', () => {
    const tasks: ITask[] = [
      makeTriggerTask(1000),
      makeActionTask(2000),
      makeActionTask(3000),
      makeActionTask(4000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'ref',
            label: 'Ref',
            outputIndex: 2,
            outputPath: 'x',
          },
        ],
      }),
    ]

    const { tasks: updated } = removeStepReferences(tasks, 2000)
    expect(updated).toHaveLength(3)
    expect(updated[2].inputData[0].outputIndex).toBe(1)
  })

  it('does not affect references to earlier steps', () => {
    const tasks: ITask[] = [
      makeTriggerTask(1000),
      makeActionTask(2000),
      makeActionTask(3000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'trigger',
            label: 'Trigger',
            outputIndex: 0,
            outputPath: 'event',
          },
        ],
      }),
    ]

    const { tasks: updated, removedCount } = removeStepReferences(tasks, 2000)
    expect(removedCount).toBe(0)
    expect(updated[1].inputData[0].outputIndex).toBe(0)
  })
})

describe('clearDownstreamSamples', () => {
  it('clears sampleResult for steps referencing the changed step', () => {
    const tasks: ITask[] = [
      makeTriggerTask(1000),
      makeActionTask(2000, {
        sampleResult: {
          timestamp: 1,
          inputData: {},
          outputData: { x: 1 },
          status: TaskExecutionStatus.success,
        },
      }),
      makeActionTask(3000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'ref',
            label: 'Ref',
            outputIndex: 1,
            outputPath: 'x',
          },
        ],
        sampleResult: {
          timestamp: 2,
          inputData: {},
          outputData: { y: 2 },
          status: TaskExecutionStatus.success,
        },
      }),
    ]

    const updated = clearDownstreamSamples(tasks, 1)
    expect(updated[1].sampleResult).toBeDefined()
    expect(updated[2].sampleResult).toBeUndefined()
  })

  it('does not clear samples for steps not referencing the changed step', () => {
    const tasks: ITask[] = [
      makeTriggerTask(1000),
      makeActionTask(2000),
      makeActionTask(3000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'trigger',
            label: 'Trigger',
            outputIndex: 0,
            outputPath: 'data',
          },
        ],
        sampleResult: {
          timestamp: 1,
          inputData: {},
          outputData: {},
          status: TaskExecutionStatus.success,
        },
      }),
    ]

    const updated = clearDownstreamSamples(tasks, 1)
    expect(updated[2].sampleResult).toBeDefined()
  })
})

describe('computeStepConfigHash', () => {
  it('returns same hash for identical config', () => {
    const task = makeActionTask(1000)
    expect(computeStepConfigHash(task)).toBe(computeStepConfigHash(task))
  })

  it('returns different hash when service changes', () => {
    const task1 = makeActionTask(1000, {
      service: {
        type: ServiceType.invoke,
        name: ServiceName.code,
        label: 'Code',
        config: {},
      },
    })
    const task2 = makeActionTask(1000, {
      service: {
        type: ServiceType.invoke,
        name: ServiceName.http,
        label: 'HTTP',
        config: {},
      },
    })
    expect(computeStepConfigHash(task1)).not.toBe(computeStepConfigHash(task2))
  })

  it('returns different hash when inputs change', () => {
    const task1 = makeActionTask(1000, { inputData: [] })
    const task2 = makeActionTask(1000, {
      inputData: [{ type: VariableType.text, name: 'x', label: 'X' }],
    })
    expect(computeStepConfigHash(task1)).not.toBe(computeStepConfigHash(task2))
  })
})
