import { z } from 'zod'

import { AppSchema } from './app'
import { DataTypeSchema, ServiceSchema, VariableSchema } from './service'

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
  name: z.string(),
  timestamp: z.number(),
  inputData: DataTypeSchema,
  outputData: DataTypeSchema,
  status: TaskExecutionStatusSchema,
})
export type ITaskLog = z.infer<typeof TaskLogSchema>

export const BotLogSchema = z.object({
  logs: z.array(TaskLogSchema),
  usage: z.number(),
  botId: z.string(),
  userId: z.string(),
  timestamp: z.number(),
})
export type IBotLog = z.infer<typeof BotLogSchema>

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
  inputData?: T
}
