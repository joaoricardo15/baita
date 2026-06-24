import { computeTriggerToken } from '@baita/shared'

import appConfig from './config'

export function getIngestUrl(userId: string): string {
  const token = computeTriggerToken(userId)
  return `${appConfig.apiUrl}/geo/ingest/${token}`
}

export function getCurrentPosition(
  timeoutMs = 5000
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 30000,
    })
  })
}

export interface IIngestResult {
  matchedPlace?: { placeId: string; name: string }
}

export async function publishLocationPoint(
  userId: string,
  position: { lat: number; lng: number }
): Promise<IIngestResult> {
  const ingestUrl = getIngestUrl(userId)
  const response = await fetch(ingestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: [{ lat: position.lat, lng: position.lng }],
      source: 'app',
    }),
  })
  const result = await response.json()
  return { matchedPlace: result?.data?.matchedPlace }
}

export async function testLocationConnection(ingestUrl: string): Promise<{
  success: boolean
  message: string
  data?: Record<string, unknown>
}> {
  try {
    const position = await getCurrentPosition(10000)

    const response = await fetch(ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }),
    })

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        message: 'connected',
        data: result.data,
      }
    }

    return {
      success: false,
      message: result.message || 'unknown_error',
    }
  } catch (err: unknown) {
    if (err instanceof GeolocationPositionError) {
      if (err.code === err.PERMISSION_DENIED) {
        return { success: false, message: 'permission_denied' }
      }
      if (err.code === err.POSITION_UNAVAILABLE) {
        return { success: false, message: 'position_unavailable' }
      }
      if (err.code === err.TIMEOUT) {
        return { success: false, message: 'timeout' }
      }
    }

    const message = err instanceof Error ? err.message : 'connection_failed'
    return { success: false, message }
  }
}
