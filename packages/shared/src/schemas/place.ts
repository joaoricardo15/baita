/**
 * Place — Geolocated memory with photos
 *
 * DDD Role: Standalone Entity (managed via generic Resource CRUD)
 *
 * Saved locations with coordinates and attached photos. Managed through the
 * generic resource endpoint (POST /resource/place/{operation}/{id?}).
 *
 * Storage: DynamoDB with sortKey `#PLACE#{placeId}`
 */
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
