import { z } from 'zod'

import {
  TaskExecutionResultSchema,
  TaskLogSchema,
  TaskSchema,
} from '../../schemas/task'

export * from '../../schemas/task'

export const BotLogSchema = z.object({
  logs: z.array(TaskLogSchema),
  usage: z.number(),
  botId: z.string(),
  timestamp: z.number(),
})
export type IBotLog = z.infer<typeof BotLogSchema>

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
