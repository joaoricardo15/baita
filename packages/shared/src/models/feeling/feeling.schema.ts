import { z } from 'zod'

export const FeelingSchema = z.object({
  feelingId: z.string(),
  content: z.string(),
  mood: z
    .enum(['peaceful', 'joyful', 'curious', 'anxious', 'scary', 'sad'])
    .optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type IFeeling = z.infer<typeof FeelingSchema>
