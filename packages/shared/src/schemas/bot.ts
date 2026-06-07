/**
 * Bot — Workflow automation (aggregate root)
 *
 * DDD Role: Aggregate Root (consistency boundary for all workflow data)
 *
 * A Bot is a complete automation workflow: an ordered list of Tasks that
 * execute sequentially when triggered. At deployment time, the tasks are
 * compiled into a standalone AWS Lambda function via code generation.
 *
 * Relationships:
 * - Bot.tasks[] → ordered Task entities (the workflow steps)
 * - Bot.userId → owner (User entity)
 * - Bot.modelId → optional template reference (BotModel)
 * - Bot.apiId → AWS API Gateway resource ID (read from DynamoDB at delete time)
 * - Bot.triggerSamples[] → cached trigger execution results
 * - BotLog references Bot via botId
 *
 * External references to this aggregate MUST go through botId.
 * Tasks within the bot are not independently addressable from outside.
 */
import { z } from 'zod'

import { TaskExecutionResultSchema, TaskLogSchema, TaskSchema } from './task'

export * from './task'

// ─── Bot-Specific Schemas ───────────────────────────────────────────────────

/** Execution audit trail entry — one per bot invocation */
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

/** Pre-built automation template (deployable as a new bot) */
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
