import { z } from 'zod'

export const UsualPlaceCategorySchema = z.enum([
  'home',
  'work',
  'frequent',
  'new',
  'custom',
])
export type IUsualPlaceCategory = z.infer<typeof UsualPlaceCategorySchema>

export const UsualPlaceSchema = z.object({
  usualPlaceId: z.string(),
  name: z.string(),
  position: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  radiusM: z.number().min(25).max(500).default(50),
  category: UsualPlaceCategorySchema.default('new'),
  visitCount: z.number().default(0),
  lastVisitAt: z.string().optional(),
  avgDwellMinutes: z.number().optional(),
  score: z.number().min(0).max(1).default(0),
  address: z.string().optional(),
  pictures: z.array(z.string()).optional(),
  centroid: z
    .object({
      sumLat: z.number(),
      sumLng: z.number(),
      sampleCount: z.number(),
    })
    .optional(),
  createdAt: z.string().optional(),
})

export type IUsualPlace = z.infer<typeof UsualPlaceSchema>
