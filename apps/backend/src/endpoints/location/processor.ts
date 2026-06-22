import { IBot, IUsualPlace, ServiceName } from '@baita/shared'
import webpush from 'web-push'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import {
  computePlaceScore,
  detectStayPoints,
  filterNoise,
  IActivitySegment,
  IGpsPoint,
  isNewPlace,
  IStayPoint,
  matchToPlace,
  segmentActivities,
} from '@/lib/geo'

import { ILocationPoint } from './schema'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const SERVICE_SITE_URL = process.env.SERVICE_SITE_URL || ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@baita.help',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export interface IProcessingResult {
  staysDetected: number
  activitiesDetected: number
  newPlacesDetected: number
  visitsRecorded: number
}

export async function processLocationBatch(
  userId: string,
  points: ILocationPoint[]
): Promise<IProcessingResult> {
  const gpsPoints: IGpsPoint[] = points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    timestamp: p.timestamp,
    accuracy: p.accuracy,
    speed: p.speed,
    course: p.course,
  }))

  const filtered = filterNoise(gpsPoints)
  if (filtered.length < 2) {
    return {
      staysDetected: 0,
      activitiesDetected: 0,
      newPlacesDetected: 0,
      visitsRecorded: 0,
    }
  }

  const stays = detectStayPoints(filtered)
  const usualPlaces = await loadUsualPlaces(userId)
  const isFirstUse = usualPlaces.length === 0

  let newPlacesDetected = 0
  let visitsRecorded = 0

  for (const stay of stays) {
    const placeList = usualPlaces.map((p) => ({
      id: p.usualPlaceId,
      lat: p.position.lat,
      lng: p.position.lng,
      radiusM: p.radiusM,
    }))

    const match = matchToPlace(stay.lat, stay.lng, placeList)

    if (match) {
      await recordVisit(userId, match.placeId, stay)
      await updatePlaceStats(userId, match.placeId, stay)
      await triggerLocationBots(userId, 'arrive', match.placeId, stay)
      visitsRecorded++
    } else if (isNewPlace(stay.lat, stay.lng, placeList)) {
      const newPlaceId = await createNewUsualPlace(userId, stay)
      if (!isFirstUse) {
        await triggerLocationBots(userId, 'new_place', newPlaceId, stay)
        await sendNewPlaceNotification(userId, stay)
      }
      newPlacesDetected++
      visitsRecorded++
    }
  }

  const activities = detectActivitiesBetweenStays(filtered, stays)

  for (const activity of activities) {
    await storeActivity(userId, activity)
  }

  return {
    staysDetected: stays.length,
    activitiesDetected: activities.length,
    newPlacesDetected,
    visitsRecorded,
  }
}

async function loadUsualPlaces(userId: string): Promise<IUsualPlace[]> {
  const data = new Data(userId, 'usual-place')
  return (await data.list()) as IUsualPlace[]
}

async function recordVisit(
  userId: string,
  placeId: string,
  stay: IStayPoint
): Promise<void> {
  const data = new Data(userId, 'visit')
  const visitId = `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await data.create(visitId, {
    visitId,
    usualPlaceId: placeId,
    arrivedAt: new Date(stay.startTime).toISOString(),
    departedAt: new Date(stay.endTime).toISOString(),
    durationMinutes: Math.round(stay.durationMs / 60000),
    position: { lat: stay.lat, lng: stay.lng },
    source: 'gps',
    createdAt: new Date().toISOString(),
  })
}

async function updatePlaceStats(
  userId: string,
  placeId: string,
  stay: IStayPoint
): Promise<void> {
  const data = new Data(userId, 'usual-place')
  const place = (await data.read(placeId)) as IUsualPlace | null
  if (!place) return

  const newVisitCount = place.visitCount + 1
  const dwellMinutes = stay.durationMs / 60000
  const newAvgDwell = place.avgDwellMinutes
    ? (place.avgDwellMinutes * place.visitCount + dwellMinutes) / newVisitCount
    : dwellMinutes

  const daysSinceLast = 0
  const newScore = computePlaceScore(newVisitCount, daysSinceLast, newAvgDwell)

  const centroid = place.centroid || {
    sumLat: place.position.lat,
    sumLng: place.position.lng,
    sampleCount: 1,
  }

  await data.update(placeId, {
    visitCount: newVisitCount,
    lastVisitAt: new Date(stay.endTime).toISOString(),
    avgDwellMinutes: Math.round(newAvgDwell),
    score: Math.round(newScore * 1000) / 1000,
    centroid: {
      sumLat: centroid.sumLat + stay.lat,
      sumLng: centroid.sumLng + stay.lng,
      sampleCount: centroid.sampleCount + 1,
    },
    position: {
      lat: (centroid.sumLat + stay.lat) / (centroid.sampleCount + 1),
      lng: (centroid.sumLng + stay.lng) / (centroid.sampleCount + 1),
    },
  })
}

async function createNewUsualPlace(
  userId: string,
  stay: IStayPoint
): Promise<string> {
  const data = new Data(userId, 'usual-place')
  const placeId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await data.create(placeId, {
    usualPlaceId: placeId,
    name: 'Novo local',
    position: { lat: stay.lat, lng: stay.lng },
    radiusM: 50,
    category: 'new',
    visitCount: 1,
    lastVisitAt: new Date(stay.endTime).toISOString(),
    avgDwellMinutes: Math.round(stay.durationMs / 60000),
    score: 0.1,
    centroid: { sumLat: stay.lat, sumLng: stay.lng, sampleCount: 1 },
    createdAt: new Date().toISOString(),
  })

  const visitData = new Data(userId, 'visit')
  const visitId = `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await visitData.create(visitId, {
    visitId,
    usualPlaceId: placeId,
    arrivedAt: new Date(stay.startTime).toISOString(),
    departedAt: new Date(stay.endTime).toISOString(),
    durationMinutes: Math.round(stay.durationMs / 60000),
    position: { lat: stay.lat, lng: stay.lng },
    source: 'gps',
    createdAt: new Date().toISOString(),
  })

  return placeId
}

function detectActivitiesBetweenStays(
  points: IGpsPoint[],
  stays: IStayPoint[]
): IActivitySegment[] {
  if (stays.length < 2) return []

  const activities: IActivitySegment[] = []

  for (let i = 0; i < stays.length - 1; i++) {
    const gapStart = stays[i].endTime
    const gapEnd = stays[i + 1].startTime

    const movementPoints = points.filter(
      (p) => p.timestamp > gapStart && p.timestamp < gapEnd
    )

    if (movementPoints.length >= 2) {
      const segments = segmentActivities(movementPoints)
      activities.push(...segments)
    }
  }

  return activities
}

async function storeActivity(
  userId: string,
  segment: IActivitySegment
): Promise<void> {
  const data = new Data(userId, 'activity')
  const activityId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await data.create(activityId, {
    activityId,
    type: segment.type,
    startedAt: new Date(segment.startTime).toISOString(),
    endedAt: new Date(segment.endTime).toISOString(),
    distanceM: Math.round(segment.distanceM),
    durationMinutes: Math.round(segment.durationMinutes * 10) / 10,
    confidence: Math.round(segment.confidence * 100) / 100,
    createdAt: new Date().toISOString(),
  })
}

async function triggerLocationBots(
  userId: string,
  eventType: 'arrive' | 'leave' | 'new_place',
  placeId: string,
  stay: IStayPoint
): Promise<void> {
  const botData = new Data(userId, 'bot')
  const bots = (await botData.list()) as IBot[]

  const bot = new Bot()
  const payload = {
    eventType,
    placeId,
    position: { lat: stay.lat, lng: stay.lng },
    arrivedAt: new Date(stay.startTime).toISOString(),
    durationMinutes: Math.round(stay.durationMs / 60000),
  }

  for (const b of bots) {
    if (!b.active || !b.tasks?.length) continue

    const trigger = b.tasks[0]
    if (trigger.service?.name !== ServiceName.locationEvent) continue

    const triggerEventType = trigger.inputData?.find(
      (v) => v.name === 'eventType'
    )?.value

    if (triggerEventType && triggerEventType !== eventType) continue

    await bot.triggerBot(userId, b.botId, payload)
  }
}

async function sendNewPlaceNotification(
  userId: string,
  stay: IStayPoint
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const userData = new Data(userId, 'user')
  const user = (await userData.read()) as Record<string, unknown> | undefined
  const pushToken = user?.pushSubscription as string | undefined
  if (!pushToken) return

  try {
    const subscription = JSON.parse(pushToken) as webpush.PushSubscription
    const payload = JSON.stringify({
      notification: {
        title: 'Novo local detectado',
        body: `Estiveste num local novo durante ${Math.round(stay.durationMs / 60000)} minutos. Queres guardar?`,
        icon: `${SERVICE_SITE_URL}/logo.png`,
        badge: `${SERVICE_SITE_URL}/badge.png`,
        tag: 'new-place',
        requireInteraction: true,
        data: {
          url: `${SERVICE_SITE_URL}/place?lat=${stay.lat}&lng=${stay.lng}&new=true`,
        },
      },
    })

    await webpush.sendNotification(subscription, payload, {
      topic: 'new-place',
      urgency: 'normal',
    })
  } catch {
    // Subscription expired or invalid — ignore silently
  }
}
