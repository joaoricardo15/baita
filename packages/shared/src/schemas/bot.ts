import { z } from 'zod'

import { AppConfigSchema, AppSchema } from './app'
import {
  DataTypeSchema,
  ServiceConfigSchema,
  ServiceSchema,
  VariableSchema,
  VariableType,
} from './service'

export enum TaskExecutionStatus {
  fail = 'fail',
  filtered = 'filtered',
  success = 'success',
}
export const TaskExecutionStatusSchema = z.nativeEnum(TaskExecutionStatus)

export enum ConditionOperator {
  equals = 'Equals',
  notEquals = 'Not equals',
  exists = 'Exists',
  doNotExists = 'Do not exists',
  contains = 'Contains',
  startsWith = 'Starts with',
  endsWith = 'Ends with',
}
export const ConditionOperatorSchema = z.nativeEnum(ConditionOperator)

export const TaskConditionSchema = z.object({
  operator: ConditionOperatorSchema,
  operand: VariableSchema,
  comparisonOperand: VariableSchema.optional(),
})
export type ITaskCondition = z.infer<typeof TaskConditionSchema>

export const TaskExecutionResultSchema = z.object({
  timestamp: z.number(),
  inputData: DataTypeSchema,
  outputData: DataTypeSchema.nullable(),
  status: TaskExecutionStatusSchema,
})
export type ITaskExecutionResult = z.infer<typeof TaskExecutionResultSchema>

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().min(1).max(5).default(1),
  backoffMs: z.number().min(100).max(60000).default(1000),
})

export type IRetryPolicy = z.infer<typeof RetryPolicySchema>

export const TaskSchema = z.object({
  taskId: z.number(),
  app: AppSchema.optional(),
  service: ServiceSchema.optional(),
  returnData: z.boolean().optional(),
  inputData: z.array(VariableSchema),
  sampleResult: TaskExecutionResultSchema.optional(),
  sampleConfigHash: z.string().optional(),
  conditions: z.array(z.array(TaskConditionSchema)).optional(),
  connectionId: z.union([z.string(), z.number()]).optional(),
  retryPolicy: RetryPolicySchema.optional(),
})
export type ITask = z.infer<typeof TaskSchema>

export const TaskLogSchema = z.object({
  name: z.string(),
  timestamp: z.number(),
  inputData: DataTypeSchema,
  outputData: DataTypeSchema,
  status: TaskExecutionStatusSchema,
})
export type ITaskLog = z.infer<typeof TaskLogSchema>

export const StepExecutionSchema = z.object({
  stepIndex: z.number(),
  stepId: z.number(),
  service: z.string(),
  status: TaskExecutionStatusSchema,
  startedAt: z.number(),
  completedAt: z.number(),
  durationMs: z.number(),
  input: DataTypeSchema.optional(),
  output: DataTypeSchema.optional(),
  error: z.string().optional(),
  attempts: z.number().default(1),
})
export type IStepExecution = z.infer<typeof StepExecutionSchema>

export const BotLogSchema = z.object({
  logs: z.array(TaskLogSchema),
  usage: z.number(),
  botId: z.string(),
  userId: z.string(),
  timestamp: z.number(),
})
export type IBotLog = z.infer<typeof BotLogSchema>

export const TaskExecutionInputSchema = z.object({
  userId: z.string(),
  botId: z.string(),
  connectionId: z.union([z.string(), z.number()]).nullable().optional(),
  appConfig: AppConfigSchema,
  serviceConfig: ServiceConfigSchema,
  inputData: DataTypeSchema.optional(),
})

export const BotUsageSchema = z.object({
  total: z.number(),
})
export type IBotUsage = z.infer<typeof BotUsageSchema>

export const BotModelSchema = z.object({
  modelId: z.string(),
  author: z.string(),
  name: z.string(),
  tasks: z.array(TaskSchema),
  image: z.string().optional(),
  description: z.string().optional(),
})
export type IBotModel = z.infer<typeof BotModelSchema>

export const BotSchema = z.object({
  botId: z.string(),
  userId: z.string(),
  modelId: z.string().optional(),
  apiId: z.string(),
  name: z.string(),
  active: z.boolean(),
  triggerUrl: z.string(),
  triggerSamples: z.array(TaskExecutionResultSchema),
  tasks: z.array(TaskSchema),
  image: z.string().optional(),
  description: z.string().optional(),
})
export type IBot = z.infer<typeof BotSchema>

export interface ITaskExecutionInput<T = unknown> {
  userId: string
  botId: string
  appConfig: import('./app').IAppConfig
  serviceConfig: import('./service').IServiceConfig
  connectionId?: string | number
  inputData: T
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface IValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateBot(bot: IBot): IValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (let i = 0; i < bot.tasks.length; i++) {
    const task = bot.tasks[i]

    if (i > 0 && !task.service) {
      errors.push(`Step ${i + 1}: missing service configuration`)
    }

    for (const input of task.inputData) {
      if (input.type === VariableType.output) {
        // Validate outputIndex references an earlier step
        if (input.outputIndex !== undefined && input.outputIndex >= i) {
          errors.push(
            `Step ${i + 1}: input "${input.name}" references step ${input.outputIndex + 1} which hasn't executed yet`
          )
        }
        // Validate referenced step exists
        if (
          input.outputIndex !== undefined &&
          input.outputIndex >= bot.tasks.length
        ) {
          errors.push(
            `Step ${i + 1}: input "${input.name}" references non-existent step ${input.outputIndex + 1}`
          )
        }
        // Validate path against sample data (warning, not error)
        if (input.outputIndex !== undefined && input.outputPath) {
          const referencedTask = bot.tasks[input.outputIndex]
          if (referencedTask?.sampleResult?.outputData) {
            const pathExists = getNestedValue(
              referencedTask.sampleResult.outputData,
              input.outputPath
            )
            if (pathExists === undefined) {
              warnings.push(
                `Step ${i + 1}: input "${input.name}" references path "${input.outputPath}" not found in test data (may be stale)`
              )
            }
          }
        }
      }
    }

    // Check for stale sample data
    if (task.sampleConfigHash && task.service) {
      const currentHash = computeStepConfigHash(task)
      if (currentHash !== task.sampleConfigHash) {
        warnings.push(
          `Step ${i + 1}: test data is stale (step configuration changed since last test)`
        )
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function computeStepConfigHash(task: ITask): string {
  const config = JSON.stringify({
    service: task.service?.name,
    inputs: task.inputData.map((v) => ({ name: v.name, type: v.type })),
  })
  let hash = 0
  for (let i = 0; i < config.length; i++) {
    const char = config.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash.toString(36)
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ─── Reference Integrity Helpers ────────────────────────────────────────────

export function removeStepReferences(
  tasks: ITask[],
  deletedTaskId: number
): { tasks: ITask[]; removedCount: number } {
  let removedCount = 0
  const deletedIndex = tasks.findIndex((t) => t.taskId === deletedTaskId)

  const updatedTasks = tasks
    .filter((t) => t.taskId !== deletedTaskId)
    .map((task) => ({
      ...task,
      inputData: task.inputData.map((input) => {
        if (
          input.type === VariableType.output &&
          input.outputIndex === deletedIndex
        ) {
          removedCount++
          return {
            ...input,
            value: undefined,
            outputIndex: undefined,
            outputPath: undefined,
          }
        }
        // Adjust indices for steps after the deleted one
        if (
          input.type === VariableType.output &&
          input.outputIndex !== undefined &&
          input.outputIndex > deletedIndex
        ) {
          return { ...input, outputIndex: input.outputIndex - 1 }
        }
        return input
      }),
    }))

  return { tasks: updatedTasks, removedCount }
}

export function clearDownstreamSamples(
  tasks: ITask[],
  changedIndex: number
): ITask[] {
  return tasks.map((task, i) => {
    if (i <= changedIndex) return task
    const referencesChanged = task.inputData.some(
      (input) =>
        input.type === VariableType.output && input.outputIndex === changedIndex
    )
    if (referencesChanged) {
      return { ...task, sampleResult: undefined, sampleConfigHash: undefined }
    }
    return task
  })
}
