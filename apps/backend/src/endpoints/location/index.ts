import { decodeTriggerToken } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

import Api, { ApiRequestStatus } from '@/utils/api'

import { processLocationBatch } from './processor'
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
    const result = await processLocationBatch(userId, points)

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

  return body
}

function normalizeOwnTracks(body: Record<string, unknown>): ILocationIngest {
  const point: ILocationPoint = {
    lat: body.lat as number,
    lng: (body.lon as number) ?? (body.lng as number),
    timestamp: ((body.tst as number) || 0) * 1000,
    accuracy: body.acc as number | undefined,
    altitude: body.alt as number | undefined,
    speed: body.vel as number | undefined,
    course: body.cog as number | undefined,
  }
  return { points: [point], source: 'owntracks' }
}

function normalizeOverland(body: Record<string, unknown>): ILocationIngest {
  const locations = body.locations as Array<{
    geometry?: { coordinates?: number[] }
    properties?: Record<string, unknown>
  }>

  const points: ILocationPoint[] = locations
    .filter((l) => l.geometry?.coordinates)
    .map((l) => ({
      lng: l.geometry!.coordinates![0],
      lat: l.geometry!.coordinates![1],
      timestamp: new Date(
        (l.properties?.timestamp as string) || Date.now()
      ).getTime(),
      accuracy: l.properties?.horizontal_accuracy as number | undefined,
      altitude: l.geometry!.coordinates![2],
      speed: l.properties?.speed as number | undefined,
      course: l.properties?.course as number | undefined,
    }))

  return { points, source: 'overland' }
}
