import { z } from 'zod'

import { MOOD_VALUES } from './feeling.constants'

export const FeelingSchema = z.object({
  feelingId: z.string(),
  content: z.string(),
  mood: z.enum(MOOD_VALUES).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type IFeeling = z.infer<typeof FeelingSchema>
