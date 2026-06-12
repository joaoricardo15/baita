import { z } from 'zod'

import { TaskSchema } from '../../../schemas/task'

export const BotTemplateSchema = z.object({
  modelId: z.string(),
  author: z.string(),
  name: z.string(),
  tasks: z.array(TaskSchema),
  image: z.string().optional(),
  description: z.string().optional(),
})
export type IBotTemplate = z.infer<typeof BotTemplateSchema>
