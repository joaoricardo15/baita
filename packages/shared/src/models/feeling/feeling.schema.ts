import { z } from 'zod'

export const FeelingSchema = z.object({
  feelingId: z.string(),
  content: z.string(),
  mood: z
    .enum([
      'calm',
      'happy',
      'excited',
      'inspired',
      'anxious',
      'scared',
      'drained',
      'ashamed',
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type IFeeling = z.infer<typeof FeelingSchema>
