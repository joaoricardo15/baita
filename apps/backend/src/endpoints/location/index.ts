import { decodeTriggerToken } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Location from '@/controllers/location'
import { IGpsPoint } from '@/lib/geo'
import Api, { ApiRequestStatus } from '@/utils/api'

import {
  ILocationIngest,
  ILocationPoint,
  validateLocationIngest,
} from './schema'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const api = new Api(event, context)

  try {
    const token = event.pathParameters?.token
    if (!token) throw new Error('Missing token')

    const userId = decodeTriggerToken(token)
    const body = JSON.parse(event.body || '{}')

    const normalized = normalizePayload(body)
    const parsed = validateLocationIngest(normalized)
    if (!parsed.valid) {
      api.httpResponse(callback, ApiRequestStatus.fail, parsed.error)
      return
    }

    const { points, source } = parsed.data
    const now = Date.now()
    const gpsPoints: IGpsPoint[] = points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      timestamp: now,
    }))

    const location = new Location()
    const result = await location.processLocationBatch(userId, gpsPoints)

    api.httpResponse(callback, ApiRequestStatus.success, undefined, {
      pointsStored: points.length,
      source,
      ...result,
    })
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}

function normalizePayload(body: Record<string, unknown>): unknown {
  if (body._type === 'location') {
    return normalizeOwnTracks(body)
  }

  if (Array.isArray(body.locations)) {
    return normalizeOverland(body)
  }

  if (typeof body.lat === 'number' && typeof body.lng === 'number') {
    return normalizeShortcuts(body)
  }

  return body
}

function normalizeOwnTracks(body: Record<string, unknown>): ILocationIngest {
  const point: ILocationPoint = {
    lat: body.lat as number,
    lng: (body.lon as number) ?? (body.lng as number),
  }
  return { points: [point], source: 'owntracks' }
}

function normalizeOverland(body: Record<string, unknown>): ILocationIngest {
  const locations = body.locations as Array<{
    geometry?: { coordinates?: number[] }
  }>

  const points: ILocationPoint[] = locations
    .filter((l) => l.geometry?.coordinates)
    .map((l) => ({
      lng: l.geometry!.coordinates![0],
      lat: l.geometry!.coordinates![1],
    }))

  return { points, source: 'overland' }
}

function normalizeShortcuts(body: Record<string, unknown>): ILocationIngest {
  const point: ILocationPoint = {
    lat: body.lat as number,
    lng: body.lng as number,
  }
  return { points: [point], source: 'shortcuts' }
}
