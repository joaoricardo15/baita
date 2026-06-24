import { z } from 'zod'

import { MOOD_VALUES } from './feeling.constants'

export const FeelingSchema = z.object({
  feelingId: z.string(),
  content: z.string(),
  mood: z.enum(MOOD_VALUES).optional(),
  tags: z.array(z.string()).optional(),
  position: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  placeId: z.string().optional(),
  placeName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type IFeeling = z.infer<typeof FeelingSchema>
