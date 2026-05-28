import { z } from 'zod'

import { AppSchema } from './app'
import { DataTypeSchema, ServiceSchema, VariableSchema } from './service'

export const TaskExecutionStatusSchema = z.enum(['success', 'fail', 'filtered'])
export type TaskExecutionStatus = z.infer<typeof TaskExecutionStatusSchema>

export const ConditionOperatorSchema = z.enum([
  'Equals',
  'Not equals',
  'Exists',
  'Do not exists',
  'Contains',
  'Starts with',
  'Ends with',
])
export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>

export const TaskConditionSchema = z.object({
  operator: ConditionOperatorSchema,
  operand: VariableSchema,
  comparisonOperand: VariableSchema.optional(),
})
export type ITaskCondition = z.infer<typeof TaskConditionSchema>

export const TaskExecutionResultSchema = z.object({
  timestamp: z.number(),
  inputData: DataTypeSchema,
  outputData: DataTypeSchema,
  status: TaskExecutionStatusSchema,
})
export type ITaskExecutionResult = z.infer<typeof TaskExecutionResultSchema>

export const TaskSchema = z.object({
  taskId: z.number(),
  app: AppSchema.optional(),
  service: ServiceSchema.optional(),
  returnData: z.boolean().optional(),
  inputData: z.array(VariableSchema),
  sampleResult: TaskExecutionResultSchema.optional(),
  conditions: z.array(z.array(TaskConditionSchema)).optional(),
  connectionId: z.union([z.string(), z.number()]).optional(),
})
export type ITask = z.infer<typeof TaskSchema>

export const TaskLogSchema = z.object({
  timestamp: z.number(),
  message: z.string(),
})
export type ITaskLog = z.infer<typeof TaskLogSchema>

export const BotLogSchema = z.object({
  botId: z.string(),
  timestamp: z.number(),
  tasks: z.array(TaskLogSchema),
})
export type IBotLog = z.infer<typeof BotLogSchema>

export const BotUsageSchema = z.object({
  date: z.string(),
  count: z.number(),
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

export const TaskExecutionInputSchema = z.object({
  userId: z.string(),
  botId: z.string(),
  appConfig: z.record(z.unknown()),
  serviceConfig: z.record(z.unknown()),
  connectionId: z.union([z.string(), z.number()]).optional(),
  inputData: DataTypeSchema.optional(),
})
export type ITaskExecutionInput = z.infer<typeof TaskExecutionInputSchema>
