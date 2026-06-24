import { haversineMeters, IPlace, IUsualPlace } from '@baita/shared'

const DEFAULT_PLACE_RADIUS_M = 50

interface IMatchedPlace {
  id: string
  name: string
}

export function matchFeelingToPlace(
  position: { lat: number; lng: number } | undefined,
  usualPlaces: IUsualPlace[],
  places: IPlace[] = []
): IMatchedPlace | null {
  if (!position) return null

  let nearest: { match: IMatchedPlace; distance: number } | null = null

  for (const up of usualPlaces) {
    const dist = haversineMeters(
      position.lat,
      position.lng,
      up.position.lat,
      up.position.lng
    )
    if (dist <= up.radiusM && (!nearest || dist < nearest.distance)) {
      nearest = {
        match: { id: up.usualPlaceId, name: up.name },
        distance: dist,
      }
    }
  }

  for (const p of places) {
    const dist = haversineMeters(
      position.lat,
      position.lng,
      p.position.lat,
      p.position.lng
    )
    if (
      dist <= DEFAULT_PLACE_RADIUS_M &&
      (!nearest || dist < nearest.distance)
    ) {
      nearest = { match: { id: p.placeId, name: p.name }, distance: dist }
    }
  }

  return nearest?.match ?? null
}
