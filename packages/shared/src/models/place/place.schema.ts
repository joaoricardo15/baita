import { z } from 'zod'

export const PlaceSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  pictures: z.array(z.string()),
  position: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  createdAt: z.string().optional(),
})

export type IPlace = z.infer<typeof PlaceSchema>
