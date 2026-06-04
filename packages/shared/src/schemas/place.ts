import { z } from 'zod'

export const PlaceSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  pictures: z.array(z.string()),
  position: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
})

export type IPlace = z.infer<typeof PlaceSchema>
