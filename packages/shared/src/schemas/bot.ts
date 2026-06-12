/**
 * Bot — Workflow automation (aggregate root)
 *
 * DDD Role: Aggregate Root (consistency boundary for all workflow data)
 *
 * A Bot is a complete automation workflow: an ordered list of Tasks that
 * execute sequentially when triggered. A shared execution engine interprets
 * the task definitions at runtime — no per-bot infrastructure is deployed.
 *
 * Relationships:
 * - Bot.tasks[] → ordered Task entities (the workflow steps)
 * - Bot.userId → owner (User entity, stored as DynamoDB partition key)
 * - Bot.modelId → optional template reference (BotModel)
 * - Bot.triggerToken → opaque token encoding userId for the trigger URL
 * - Bot.triggerSamples[] → cached trigger execution results
 * - BotLog references Bot via botId
 *
 * Trigger URL: /bots/{botId}/run/{triggerToken}
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
  timestamp: z.number(),
})
export type IBotLog = z.infer<typeof BotLogSchema>

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
  modelId: z.string().optional(),
  name: z.string(),
  active: z.boolean(),
  triggerSamples: z.array(TaskExecutionResultSchema),
  tasks: z.array(TaskSchema),
  image: z.string().optional(),
  description: z.string().optional(),
})
export type IBot = z.infer<typeof BotSchema>
