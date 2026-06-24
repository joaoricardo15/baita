import { decodeTriggerToken } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Geo from '@/controllers/geo'
import { IGpsPoint } from '@/lib/geo'
import Api, { ApiRequestStatus } from '@/utils/api'
import { getAuthenticatedUserId } from '@/utils/auth'

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
    const resource = event.resource

    if (resource === '/geo/ingest/{token}') {
      return handleIngest(event, api, callback)
    }

    const userId = getAuthenticatedUserId(event)
    const geo = new Geo()
    const method = event.httpMethod.toUpperCase()
    const id = event.pathParameters?.id

    if (resource === '/geo/match' && method === 'GET') {
      const lat = parseFloat(event.queryStringParameters?.lat || '')
      const lng = parseFloat(event.queryStringParameters?.lng || '')

      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        api.httpResponse(
          callback,
          ApiRequestStatus.fail,
          'lat must be -90..90 and lng must be -180..180'
        )
        return
      }

      const match = await geo.matchPosition(userId, lat, lng)
      api.httpResponse(
        callback,
        ApiRequestStatus.success,
        undefined,
        match ?? undefined
      )
      return
    }

    if (resource.startsWith('/geo/places')) {
      if (method === 'GET' && !id) {
        const places = await geo.listUsualPlaces(userId)
        api.httpResponse(callback, ApiRequestStatus.success, undefined, places)
        return
      }

      if (method === 'GET' && id) {
        const place = await geo.getUsualPlace(userId, id)
        if (!place) {
          api.httpResponse(callback, ApiRequestStatus.fail, 'Place not found')
          return
        }
        api.httpResponse(callback, ApiRequestStatus.success, undefined, place)
        return
      }

      if (method === 'PATCH' && id) {
        const body = JSON.parse(event.body || '{}')
        await geo.updateUsualPlace(userId, id, body)
        api.httpResponse(callback, ApiRequestStatus.success)
        return
      }

      if (method === 'DELETE' && id) {
        await geo.deleteUsualPlace(userId, id)
        api.httpResponse(callback, ApiRequestStatus.success)
        return
      }
    }

    api.httpResponse(callback, ApiRequestStatus.fail, 'Not found')
  } catch (err: unknown) {
    api.httpResponse(callback, ApiRequestStatus.fail, err)
  }
}

async function handleIngest(
  event: APIGatewayProxyEvent,
  api: Api,
  callback: Callback
): Promise<void> {
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

  const geo = new Geo()
  const result = await geo.processLocationBatch(
    userId,
    gpsPoints,
    source || 'app'
  )

  api.httpResponse(callback, ApiRequestStatus.success, undefined, {
    pointsStored: points.length,
    source,
    ...result,
  })
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
