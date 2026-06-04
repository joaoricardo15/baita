import {
  BotSchema,
  clearDownstreamSamples,
  computeStepConfigHash,
  IBot,
  ITask,
  removeStepReferences,
  RetryPolicySchema,
  TaskExecutionStatus,
  TaskSchema,
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

  it('handles task without service (trigger tasks)', () => {
    const task: ITask = { taskId: 1000, inputData: [] }
    const hash = computeStepConfigHash(task)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })
})

describe('validateBot — edge cases', () => {
  it('passes for an empty bot (no tasks)', () => {
    const bot = makeBot([])
    const result = validateBot(bot)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('passes for a bot with only a trigger (no action steps)', () => {
    const bot = makeBot([makeTriggerTask()])
    const result = validateBot(bot)
    expect(result.valid).toBe(true)
  })

  it('ignores non-output variable types in validation', () => {
    const bot = makeBot([
      makeTriggerTask(),
      makeActionTask(2000, {
        inputData: [
          {
            type: VariableType.text,
            name: 'name',
            label: 'Name',
            value: 'test',
          },
          {
            type: VariableType.constant,
            name: 'key',
            label: 'Key',
            value: 'abc',
          },
        ],
      }),
    ])
    const result = validateBot(bot)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('removeStepReferences — edge cases', () => {
  it('handles deleting a non-existent taskId gracefully', () => {
    const tasks: ITask[] = [makeTriggerTask(1000), makeActionTask(2000)]
    const { tasks: updated, removedCount } = removeStepReferences(tasks, 9999)
    expect(updated).toHaveLength(2)
    expect(removedCount).toBe(0)
  })

  it('handles empty task list', () => {
    const { tasks: updated, removedCount } = removeStepReferences([], 1000)
    expect(updated).toHaveLength(0)
    expect(removedCount).toBe(0)
  })
})

describe('clearDownstreamSamples — edge cases', () => {
  it('clears all downstream when changedIndex is 0 (trigger changed)', () => {
    const tasks: ITask[] = [
      makeTriggerTask(1000),
      makeActionTask(2000, {
        inputData: [
          {
            type: VariableType.output,
            name: 'trigger',
            label: 'Trigger',
            outputIndex: 0,
            outputPath: 'body',
          },
        ],
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
            name: 'step1',
            label: 'Step 1',
            outputIndex: 0,
            outputPath: 'data',
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

    const updated = clearDownstreamSamples(tasks, 0)
    expect(updated[0].sampleResult).toBeUndefined()
    expect(updated[1].sampleResult).toBeUndefined()
    expect(updated[2].sampleResult).toBeUndefined()
  })

  it('does not affect the changed step itself', () => {
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
    ]

    const updated = clearDownstreamSamples(tasks, 1)
    expect(updated[1].sampleResult).toBeDefined()
  })
})

describe('Zod Schema Parsing', () => {
  describe('RetryPolicySchema', () => {
    it('accepts valid retry policy', () => {
      const result = RetryPolicySchema.safeParse({
        maxAttempts: 3,
        backoffMs: 2000,
      })
      expect(result.success).toBe(true)
    })

    it('rejects maxAttempts below minimum (1)', () => {
      const result = RetryPolicySchema.safeParse({
        maxAttempts: 0,
        backoffMs: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('rejects maxAttempts above maximum (5)', () => {
      const result = RetryPolicySchema.safeParse({
        maxAttempts: 10,
        backoffMs: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('rejects backoffMs below minimum (100)', () => {
      const result = RetryPolicySchema.safeParse({
        maxAttempts: 1,
        backoffMs: 50,
      })
      expect(result.success).toBe(false)
    })

    it('rejects backoffMs above maximum (60000)', () => {
      const result = RetryPolicySchema.safeParse({
        maxAttempts: 1,
        backoffMs: 100000,
      })
      expect(result.success).toBe(false)
    })

    it('applies defaults when fields omitted', () => {
      const result = RetryPolicySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.maxAttempts).toBe(1)
        expect(result.data.backoffMs).toBe(1000)
      }
    })
  })

  describe('TaskSchema', () => {
    it('accepts minimal valid task', () => {
      const result = TaskSchema.safeParse({ taskId: 0, inputData: [] })
      expect(result.success).toBe(true)
    })

    it('rejects task without taskId', () => {
      const result = TaskSchema.safeParse({ inputData: [] })
      expect(result.success).toBe(false)
    })

    it('rejects task without inputData', () => {
      const result = TaskSchema.safeParse({ taskId: 0 })
      expect(result.success).toBe(false)
    })

    it('accepts task with all optional fields', () => {
      const result = TaskSchema.safeParse({
        taskId: 1,
        inputData: [],
        service: {
          type: 'invoke',
          name: 'code-execute',
          label: 'Code',
          config: {},
        },
        conditions: [
          [
            {
              operator: 'equals',
              operand: { type: 'text', name: 'x', label: 'X' },
            },
          ],
        ],
        retryPolicy: { maxAttempts: 3, backoffMs: 2000 },
        connectionId: 'conn-1',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('BotSchema', () => {
    it('accepts valid complete bot', () => {
      const result = BotSchema.safeParse({
        botId: 'bot-1',
        userId: 'user-1',
        apiId: 'api-1',
        name: 'Test',
        active: true,
        triggerUrl: 'https://example.com',
        triggerSamples: [],
        tasks: [{ taskId: 0, inputData: [] }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects bot without required fields', () => {
      const result = BotSchema.safeParse({ botId: 'bot-1' })
      expect(result.success).toBe(false)
    })

    it('rejects bot with invalid task in tasks array', () => {
      const result = BotSchema.safeParse({
        botId: 'bot-1',
        userId: 'user-1',
        apiId: 'api-1',
        name: 'Test',
        active: true,
        triggerUrl: 'https://example.com',
        triggerSamples: [],
        tasks: [{ invalid: true }],
      })
      expect(result.success).toBe(false)
    })
  })
})
