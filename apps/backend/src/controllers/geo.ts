import {
  generatePrefixedId,
  IBot,
  IUsualPlace,
  matchPositionToPlace,
  ServiceName,
} from '@baita/shared'
import webpush from 'web-push'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import {
  computePlaceScore,
  detectStayPoints,
  filterNoise,
  IGpsPoint,
  isNewPlace,
  IStayPoint,
  matchToPlace,
} from '@/lib/geo'

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

interface IProcessingResult {
  staysDetected: number
  newPlacesDetected: number
  matchedPlace?: { placeId: string; name: string }
}

interface IPlaceMatch {
  usualPlaceId: string
  name: string
  distance: number
}

class Geo {
  async processLocationBatch(
    userId: string,
    points: IGpsPoint[],
    source: string = 'gps'
  ): Promise<IProcessingResult> {
    const filtered = filterNoise(points)

    if (filtered.length === 1) {
      return this.handleSinglePoint(userId, filtered[0], source)
    }

    if (filtered.length < 2) {
      return { staysDetected: 0, newPlacesDetected: 0 }
    }

    const usualPlaceStore = new Data(userId, 'usual-place')
    const botStore = new Data(userId, 'bot')
    const userStore = new Data(userId, 'user')

    const stays = detectStayPoints(filtered)
    const usualPlaces = (await usualPlaceStore.list()) as IUsualPlace[]
    const isFirstUse = usualPlaces.length === 0

    let newPlacesDetected = 0

    for (const stay of stays) {
      const placeList = usualPlaces.map((p) => ({
        id: p.usualPlaceId,
        lat: p.position.lat,
        lng: p.position.lng,
        radiusM: p.radiusM,
      }))

      const match = matchToPlace(stay.lat, stay.lng, placeList)

      if (match) {
        await this.updatePlaceStats(usualPlaceStore, match.placeId, stay)
        await this.triggerLocationBots(
          botStore,
          userId,
          'arrive',
          match.placeId,
          stay
        )
      } else if (isNewPlace(stay.lat, stay.lng, placeList)) {
        const newPlaceId = await this.createNewUsualPlace(usualPlaceStore, stay)
        if (!isFirstUse) {
          await this.triggerLocationBots(
            botStore,
            userId,
            'new_place',
            newPlaceId,
            stay
          )
          await this.sendNewPlaceNotification(userStore, stay)
        }
        newPlacesDetected++
      }
    }

    return { staysDetected: stays.length, newPlacesDetected }
  }

  private async handleSinglePoint(
    userId: string,
    point: IGpsPoint,
    source: string
  ): Promise<IProcessingResult> {
    const usualPlaceStore = new Data(userId, 'usual-place')
    const placeStore = new Data(userId, 'place')
    const botStore = new Data(userId, 'bot')
    const userStore = new Data(userId, 'user')

    const usualPlaces = (await usualPlaceStore.list()) as IUsualPlace[]
    const regularPlaces =
      ((await placeStore.list()) as Array<{
        placeId: string
        name: string
        position: { lat: number; lng: number }
      }>) ?? []

    const placeList = [
      ...usualPlaces.map((p) => ({
        id: p.usualPlaceId,
        lat: p.position.lat,
        lng: p.position.lng,
        radiusM: p.radiusM,
      })),
      ...regularPlaces.map((p) => ({
        id: p.placeId,
        lat: p.position.lat,
        lng: p.position.lng,
        radiusM: 50,
      })),
    ]

    const now = point.timestamp || Date.now()
    const stay: IStayPoint = {
      lat: point.lat,
      lng: point.lng,
      startTime: now,
      endTime: now,
      durationMs: 0,
      pointCount: 1,
    }

    const match = matchToPlace(point.lat, point.lng, placeList)

    if (match) {
      const matchedUsualPlace = usualPlaces.find(
        (p) => p.usualPlaceId === match.placeId
      )
      const matchedRegularPlace = regularPlaces.find(
        (p) => p.placeId === match.placeId
      )
      const matchedName =
        matchedUsualPlace?.name ?? matchedRegularPlace?.name ?? ''

      if (matchedUsualPlace) {
        await this.updatePlaceStats(usualPlaceStore, match.placeId, stay)
      }

      await this.triggerLocationBots(
        botStore,
        userId,
        'arrive',
        match.placeId,
        stay
      )

      return {
        staysDetected: 0,
        newPlacesDetected: 0,
        matchedPlace: { placeId: match.placeId, name: matchedName },
      }
    }

    if (source !== 'app' && isNewPlace(point.lat, point.lng, placeList)) {
      const isFirstUse = usualPlaces.length === 0
      const newPlaceId = await this.createNewUsualPlace(usualPlaceStore, stay)
      if (!isFirstUse) {
        await this.triggerLocationBots(
          botStore,
          userId,
          'new_place',
          newPlaceId,
          stay
        )
        await this.sendNewPlaceNotification(userStore, stay)
      }
      return { staysDetected: 0, newPlacesDetected: 1 }
    }

    return { staysDetected: 0, newPlacesDetected: 0 }
  }

  async matchPosition(
    userId: string,
    lat: number,
    lng: number
  ): Promise<IPlaceMatch | null> {
    const usualPlaceStore = new Data(userId, 'usual-place')
    const usualPlaces = (await usualPlaceStore.list()) as IUsualPlace[]

    const candidates = usualPlaces.map((p) => ({
      id: p.usualPlaceId,
      lat: p.position.lat,
      lng: p.position.lng,
      radiusM: p.radiusM,
    }))

    const match = matchPositionToPlace({ lat, lng }, candidates)
    if (!match) return null

    const place = usualPlaces.find((p) => p.usualPlaceId === match.placeId)
    if (!place) return null

    return {
      usualPlaceId: place.usualPlaceId,
      name: place.name,
      distance: Math.round(match.distance),
    }
  }

  async listUsualPlaces(userId: string): Promise<IUsualPlace[]> {
    const store = new Data(userId, 'usual-place')
    return ((await store.list()) as IUsualPlace[] | undefined) ?? []
  }

  async getUsualPlace(
    userId: string,
    placeId: string
  ): Promise<IUsualPlace | null> {
    const store = new Data(userId, 'usual-place')
    return (await store.read(placeId)) as IUsualPlace | null
  }

  async updateUsualPlace(
    userId: string,
    placeId: string,
    data: Partial<IUsualPlace>
  ): Promise<void> {
    const store = new Data(userId, 'usual-place')
    await store.update(placeId, data)
  }

  async deleteUsualPlace(userId: string, placeId: string): Promise<void> {
    const store = new Data(userId, 'usual-place')
    await store.delete(placeId)
  }

  private async updatePlaceStats(
    usualPlaceStore: Data,
    placeId: string,
    stay: IStayPoint
  ): Promise<void> {
    const place = (await usualPlaceStore.read(placeId)) as IUsualPlace | null
    if (!place) return

    const newVisitCount = place.visitCount + 1
    const dwellMinutes = stay.durationMs / 60000
    const newAvgDwell = place.avgDwellMinutes
      ? (place.avgDwellMinutes * place.visitCount + dwellMinutes) /
        newVisitCount
      : dwellMinutes

    const daysSinceLast = 0
    const newScore = computePlaceScore(
      newVisitCount,
      daysSinceLast,
      newAvgDwell
    )

    const centroid = place.centroid || {
      sumLat: place.position.lat,
      sumLng: place.position.lng,
      sampleCount: 1,
    }

    await usualPlaceStore.update(placeId, {
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

  private async createNewUsualPlace(
    usualPlaceStore: Data,
    stay: IStayPoint
  ): Promise<string> {
    const placeId = generatePrefixedId('up')

    await usualPlaceStore.create(placeId, {
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
    })

    return placeId
  }

  private async triggerLocationBots(
    botStore: Data,
    userId: string,
    eventType: 'arrive' | 'leave' | 'new_place',
    placeId: string,
    stay: IStayPoint
  ): Promise<void> {
    const bots = (await botStore.list()) as IBot[]

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

  private async sendNewPlaceNotification(
    userStore: Data,
    stay: IStayPoint
  ): Promise<void> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

    const user = (await userStore.read()) as Record<string, unknown> | undefined
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
      // Subscription expired or invalid
    }
  }
}

export default Geo
