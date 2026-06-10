/**
 * Task — A single executable step in a bot workflow
 *
 * DDD Role: Entity within Aggregate (local identity via taskId, mutable state)
 *
 * A Task is the atomic unit of execution. It combines a Service (what to do),
 * an App (where to call), input data (with what values), and optional connection
 * credentials (authenticated as whom). Tasks only exist within a Bot's tasks[].
 *
 * taskId is a positional index (number), NOT a UUID — it identifies the step
 * within its parent bot. Tasks reference earlier tasks via Variable.outputIndex
 * to chain data through the workflow.
 *
 * Relationships:
 * - Always nested in Bot.tasks[] or BotModel.tasks[]
 * - task.service → Service value object (execution strategy)
 * - task.app → App value object (API config)
 * - task.connectionId → FK to Connection entity
 * - task.inputData[].outputIndex → references earlier task in same bot
 * - task.sampleResult → cached test execution output
 *
 * Runtime: Tasks can be executed independently via POST /task/execute (for
 * testing), or baked into generated Lambda code at bot deployment time.
 */
import { z } from 'zod'

import { AppConfigSchema, AppSchema } from './app'
import {
  DataTypeSchema,
  ServiceConfigSchema,
  ServiceSchema,
  VariableSchema,
  VariableType,
} from './service'

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum TaskExecutionStatus {
  fail = 'fail',
  filtered = 'filtered',
  success = 'success',
}
export const TaskExecutionStatusSchema = z.nativeEnum(TaskExecutionStatus)

export enum ConditionOperator {
  equals = 'equals',
  notEquals = 'not-equals',
  exists = 'exists',
  doesNotExist = 'does-not-exist',
  contains = 'contains',
  startsWith = 'starts-with',
  endsWith = 'ends-with',
}
export const ConditionOperatorSchema = z.nativeEnum(ConditionOperator)

// ─── Schemas ────────────────────────────────────────────────────────────────

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
  duration: z.number(),
  input: DataTypeSchema.optional(),
  output: DataTypeSchema.optional(),
  error: z.string().optional(),
  attempts: z.number().default(1),
})
export type IStepExecution = z.infer<typeof StepExecutionSchema>

/** Runtime execution payload sent to the task executor (backend-only extension) */
export const TaskExecutionInputSchema = z.object({
  userId: z.string(),
  botId: z.string(),
  connectionId: z.union([z.string(), z.number()]).nullable().optional(),
  appConfig: AppConfigSchema,
  serviceConfig: ServiceConfigSchema,
  inputData: DataTypeSchema.optional(),
})

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

export function getTaskLabel(index: number): string {
  return index === 0 ? 'Trigger' : `Task ${index}`
}

export function validateBot(bot: { tasks: ITask[] }): IValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (let i = 0; i < bot.tasks.length; i++) {
    const task = bot.tasks[i]

    if (i > 0 && !task.service) {
      errors.push(`${getTaskLabel(i)}: missing service configuration`)
    }

    for (const input of task.inputData) {
      if (input.type === VariableType.output) {
        if (input.outputIndex !== undefined && input.outputIndex >= i) {
          errors.push(
            `${getTaskLabel(i)}: input "${input.name}" references ${getTaskLabel(input.outputIndex)} which hasn't executed yet`
          )
        }
        if (
          input.outputIndex !== undefined &&
          input.outputIndex >= bot.tasks.length
        ) {
          errors.push(
            `${getTaskLabel(i)}: input "${input.name}" references non-existent step ${input.outputIndex + 1}`
          )
        }
        if (input.outputIndex !== undefined && input.outputPath) {
          const referencedTask = bot.tasks[input.outputIndex]
          if (referencedTask?.sampleResult?.outputData) {
            const pathExists = getNestedValue(
              referencedTask.sampleResult.outputData,
              input.outputPath
            )
            if (pathExists === undefined) {
              warnings.push(
                `${getTaskLabel(i)}: input "${input.name}" references path "${input.outputPath}" not found in test data (may be stale)`
              )
            }
          }
        }
      }
    }

    if (task.sampleConfigHash && task.service) {
      const currentHash = computeStepConfigHash(task)
      if (currentHash !== task.sampleConfigHash) {
        warnings.push(
          `${getTaskLabel(i)}: test data is stale (step configuration changed since last test)`
        )
      }
    }

    if (task.service?.config?.inputFields) {
      for (const field of task.service.config.inputFields) {
        if (
          field.required &&
          field.type !== VariableType.constant &&
          field.type !== VariableType.environment
        ) {
          const stored = task.inputData.find((d) => d.name === field.name)
          const hasValue =
            stored?.value ||
            stored?.outputIndex !== undefined ||
            stored?.outputPath !== undefined
          if (!hasValue) {
            errors.push(
              `${getTaskLabel(i)}: required field "${field.label}" is missing`
            )
          }
        }
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
