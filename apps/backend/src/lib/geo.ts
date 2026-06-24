import { haversineMeters } from '@baita/shared'

export { haversineMeters }

export interface IGpsPoint {
  lat: number
  lng: number
  timestamp: number
}

export interface IStayPoint {
  lat: number
  lng: number
  startTime: number
  endTime: number
  durationMs: number
  pointCount: number
}

export function filterNoise(
  points: IGpsPoint[],
  maxSpeedKmh = 200
): IGpsPoint[] {
  const maxSpeedMs = maxSpeedKmh / 3.6
  const filtered: IGpsPoint[] = []

  for (let i = 0; i < points.length; i++) {
    const p = points[i]

    if (filtered.length > 0) {
      const prev = filtered[filtered.length - 1]
      const dist = haversineMeters(prev.lat, prev.lng, p.lat, p.lng)
      const dt = (p.timestamp - prev.timestamp) / 1000
      if (dt > 0 && dist / dt > maxSpeedMs) continue
    }

    filtered.push(p)
  }

  return filtered
}

/**
 * Li et al. (2008) stay-point detection algorithm.
 * Finds locations where user remained within distThresholdM for at least timeThresholdMs.
 */
export function detectStayPoints(
  points: IGpsPoint[],
  distThresholdM = 50,
  timeThresholdMs = 5 * 60 * 1000
): IStayPoint[] {
  const stays: IStayPoint[] = []
  if (points.length < 2) return stays

  let i = 0
  while (i < points.length) {
    let j = i + 1
    while (j < points.length) {
      if (
        haversineMeters(
          points[i].lat,
          points[i].lng,
          points[j].lat,
          points[j].lng
        ) > distThresholdM
      ) {
        break
      }
      j++
    }

    const dwell =
      points[Math.min(j - 1, points.length - 1)].timestamp - points[i].timestamp
    if (dwell >= timeThresholdMs) {
      const segment = points.slice(i, j)
      const lat = segment.reduce((s, p) => s + p.lat, 0) / segment.length
      const lng = segment.reduce((s, p) => s + p.lng, 0) / segment.length

      stays.push({
        lat,
        lng,
        startTime: points[i].timestamp,
        endTime: points[Math.min(j - 1, points.length - 1)].timestamp,
        durationMs: dwell,
        pointCount: segment.length,
      })
      i = j
    } else {
      i++
    }
  }

  return stays
}

/**
 * Checks if a point is inside any known place.
 * Returns the matched place ID or null if it's a new location.
 */
export function matchToPlace(
  lat: number,
  lng: number,
  places: Array<{ id: string; lat: number; lng: number; radiusM: number }>
): { placeId: string; distance: number } | null {
  let nearest: { placeId: string; distance: number } | null = null

  for (const place of places) {
    const dist = haversineMeters(lat, lng, place.lat, place.lng)
    if (dist <= place.radiusM) {
      if (!nearest || dist < nearest.distance) {
        nearest = { placeId: place.id, distance: dist }
      }
    }
  }

  return nearest
}

/**
 * Determines if a stay point represents a new (previously unknown) place.
 * A point is "new" if it's more than newPlaceThresholdM from all known places.
 */
export function isNewPlace(
  lat: number,
  lng: number,
  places: Array<{ id: string; lat: number; lng: number; radiusM: number }>,
  newPlaceThresholdM = 150
): boolean {
  for (const place of places) {
    const dist = haversineMeters(lat, lng, place.lat, place.lng)
    if (dist <= newPlaceThresholdM) return false
  }
  return true
}

/**
 * Computes importance score for a place based on frequency, recency, and duration.
 */
export function computePlaceScore(
  visitCount: number,
  daysSinceLastVisit: number,
  avgDwellMinutes: number,
  halfLifeDays = 14
): number {
  const frequencyScore = Math.log(1 + visitCount) / Math.log(1 + 100)
  const lambda = Math.LN2 / halfLifeDays
  const recencyScore = Math.exp(-lambda * daysSinceLastVisit)
  const durationScore = Math.min(1, avgDwellMinutes / 120)

  return 0.4 * frequencyScore + 0.35 * recencyScore + 0.25 * durationScore
}
