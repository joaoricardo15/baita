import { z } from 'zod'

export const ActivityTypeSchema = z.enum([
  'walking',
  'running',
  'cycling',
  'driving',
  'transit',
])
export type IActivityType = z.infer<typeof ActivityTypeSchema>

export const ActivitySchema = z.object({
  activityId: z.string(),
  type: ActivityTypeSchema,
  startedAt: z.string(),
  endedAt: z.string(),
  distanceM: z.number(),
  durationMinutes: z.number(),
  fromPlaceId: z.string().optional(),
  toPlaceId: z.string().optional(),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().optional(),
})

export type IActivity = z.infer<typeof ActivitySchema>
