import { IActivityType } from '@baita/shared'

export interface IGpsPoint {
  lat: number
  lng: number
  timestamp: number
  accuracy?: number
  speed?: number
  course?: number
}

export interface IStayPoint {
  lat: number
  lng: number
  startTime: number
  endTime: number
  durationMs: number
  pointCount: number
}

export interface IActivitySegment {
  type: IActivityType
  startTime: number
  endTime: number
  distanceM: number
  durationMinutes: number
  confidence: number
  points: IGpsPoint[]
}

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

export function filterNoise(
  points: IGpsPoint[],
  maxAccuracyM = 65,
  maxSpeedKmh = 200
): IGpsPoint[] {
  const maxSpeedMs = maxSpeedKmh / 3.6
  const filtered: IGpsPoint[] = []

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (p.accuracy && p.accuracy > maxAccuracyM) continue

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
 * Speed-based activity classification.
 * Classifies a segment of GPS points by median speed.
 */
export function classifyActivity(points: IGpsPoint[]): {
  type: IActivityType
  confidence: number
} {
  if (points.length < 2) return { type: 'walking', confidence: 0.3 }

  const speeds: number[] = []
  for (let i = 1; i < points.length; i++) {
    const dist = haversineMeters(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    )
    const dt = (points[i].timestamp - points[i - 1].timestamp) / 1000
    if (dt > 0) speeds.push((dist / dt) * 3.6)
  }

  if (speeds.length === 0) return { type: 'walking', confidence: 0.3 }

  speeds.sort((a, b) => a - b)
  const median = speeds[Math.floor(speeds.length / 2)]
  const p95 = speeds[Math.floor(speeds.length * 0.95)]

  if (p95 > 50) return { type: 'driving', confidence: 0.9 }
  if (median > 30) return { type: 'driving', confidence: 0.8 }
  if (median >= 10 && median <= 30) return { type: 'cycling', confidence: 0.7 }
  if (median >= 7 && median < 10) return { type: 'running', confidence: 0.65 }
  if (median >= 2) return { type: 'walking', confidence: 0.85 }

  return { type: 'walking', confidence: 0.5 }
}

/**
 * Segments a movement trace (between two stays) into activity legs.
 * Uses a sliding window with mode change detection.
 */
export function segmentActivities(
  points: IGpsPoint[],
  windowSize = 5
): IActivitySegment[] {
  if (points.length < 3) {
    const { type, confidence } = classifyActivity(points)
    const dist =
      points.length >= 2
        ? haversineMeters(
            points[0].lat,
            points[0].lng,
            points[points.length - 1].lat,
            points[points.length - 1].lng
          )
        : 0
    return [
      {
        type,
        startTime: points[0]?.timestamp ?? 0,
        endTime: points[points.length - 1]?.timestamp ?? 0,
        distanceM: dist,
        durationMinutes:
          points.length >= 2
            ? (points[points.length - 1].timestamp - points[0].timestamp) /
              60000
            : 0,
        confidence,
        points,
      },
    ]
  }

  const segments: IActivitySegment[] = []
  let segStart = 0
  let currentType = classifyActivity(
    points.slice(0, Math.min(windowSize, points.length))
  ).type

  for (let i = windowSize; i < points.length; i += windowSize) {
    const window = points.slice(i, Math.min(i + windowSize, points.length))
    if (window.length < 2) break

    const { type: windowType } = classifyActivity(window)

    if (windowType !== currentType) {
      const segPoints = points.slice(segStart, i)
      const { confidence } = classifyActivity(segPoints)
      let dist = 0
      for (let k = 1; k < segPoints.length; k++) {
        dist += haversineMeters(
          segPoints[k - 1].lat,
          segPoints[k - 1].lng,
          segPoints[k].lat,
          segPoints[k].lng
        )
      }

      segments.push({
        type: currentType,
        startTime: segPoints[0].timestamp,
        endTime: segPoints[segPoints.length - 1].timestamp,
        distanceM: dist,
        durationMinutes:
          (segPoints[segPoints.length - 1].timestamp - segPoints[0].timestamp) /
          60000,
        confidence,
        points: segPoints,
      })

      segStart = i
      currentType = windowType
    }
  }

  const remaining = points.slice(segStart)
  if (remaining.length >= 2) {
    const { confidence } = classifyActivity(remaining)
    let dist = 0
    for (let k = 1; k < remaining.length; k++) {
      dist += haversineMeters(
        remaining[k - 1].lat,
        remaining[k - 1].lng,
        remaining[k].lat,
        remaining[k].lng
      )
    }

    segments.push({
      type: currentType,
      startTime: remaining[0].timestamp,
      endTime: remaining[remaining.length - 1].timestamp,
      distanceM: dist,
      durationMinutes:
        (remaining[remaining.length - 1].timestamp - remaining[0].timestamp) /
        60000,
      confidence: confidence,
      points: remaining,
    })
  }

  return segments
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
