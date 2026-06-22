import { z } from 'zod'

export const VisitSchema = z.object({
  visitId: z.string(),
  usualPlaceId: z.string(),
  arrivedAt: z.string(),
  departedAt: z.string().optional(),
  durationMinutes: z.number().optional(),
  position: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracyM: z.number().optional(),
  }),
  source: z.enum(['manual', 'gps', 'geofence']).default('gps'),
  createdAt: z.string().optional(),
})

export type IVisit = z.infer<typeof VisitSchema>
