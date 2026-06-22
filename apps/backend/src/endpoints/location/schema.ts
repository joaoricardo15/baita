export interface ILocationPoint {
  lat: number
  lng: number
}

export interface ILocationIngest {
  points: ILocationPoint[]
  source?: 'shortcuts' | 'owntracks' | 'overland' | 'app'
}

export function validateLocationIngest(
  body: unknown
): { valid: true; data: ILocationIngest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' }
  }

  const obj = body as Record<string, unknown>

  if (!Array.isArray(obj.points) || obj.points.length === 0) {
    return { valid: false, error: 'points must be a non-empty array' }
  }

  if (obj.points.length > 100) {
    return { valid: false, error: 'Maximum 100 points per request' }
  }

  for (let i = 0; i < obj.points.length; i++) {
    const p = obj.points[i] as Record<string, unknown>
    if (typeof p.lat !== 'number' || p.lat < -90 || p.lat > 90) {
      return {
        valid: false,
        error: `points[${i}].lat must be between -90 and 90`,
      }
    }
    if (typeof p.lng !== 'number' || p.lng < -180 || p.lng > 180) {
      return {
        valid: false,
        error: `points[${i}].lng must be between -180 and 180`,
      }
    }
  }

  const source = (obj.source as string) || 'app'
  const validSources = ['shortcuts', 'owntracks', 'overland', 'app']
  if (!validSources.includes(source)) {
    return {
      valid: false,
      error: `source must be one of: ${validSources.join(', ')}`,
    }
  }

  return {
    valid: true,
    data: {
      points: obj.points as ILocationPoint[],
      source: source as ILocationIngest['source'],
    },
  }
}
