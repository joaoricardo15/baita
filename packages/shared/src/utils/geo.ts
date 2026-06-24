const EARTH_RADIUS_M = 6_371_008.8

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface IPlaceCandidate {
  id: string
  lat: number
  lng: number
  radiusM: number
}

export function matchPositionToPlace(
  position: { lat: number; lng: number },
  places: IPlaceCandidate[]
): { placeId: string; distance: number } | null {
  let nearest: { placeId: string; distance: number } | null = null

  for (const place of places) {
    const dist = haversineMeters(
      position.lat,
      position.lng,
      place.lat,
      place.lng
    )
    if (dist <= place.radiusM) {
      if (!nearest || dist < nearest.distance) {
        nearest = { placeId: place.id, distance: dist }
      }
    }
  }

  return nearest
}
