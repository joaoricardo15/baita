import { z } from 'zod'

export const GuideSchema = z.object({
  guideId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  placeIds: z.array(z.string()),
  createdAt: z.string().optional(),
})

export type IGuide = z.infer<typeof GuideSchema>
