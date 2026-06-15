/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

interface ExtendedNotificationOptions extends NotificationOptions {
  image?: string
  renotify?: boolean
  vibrate?: number[]
  timestamp?: number
  actions?: { action: string; title: string; icon?: string }[]
}

// Pass through Auth0 callback redirects (don't serve from cache)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    event.request.mode === 'navigate' &&
    (url.searchParams.has('code') || url.searchParams.has('error'))
  ) {
    event.respondWith(fetch(event.request))
  }
})

precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title?: string
  body?: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  renotify?: boolean
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
  timestamp?: number
  dir?: NotificationDirection
  lang?: string
  actions?: { action: string; title: string; icon?: string }[]
  data?: {
    url?: string
    actionUrls?: Record<string, string>
    [key: string]: unknown
  }
  click_action?: string
  fcmOptions?: { link?: string }
}

function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data || event.data.text() === '') {
    return { title: 'Baita', body: 'New notification' }
  }

  try {
    const raw = event.data.json()
    return raw.notification || raw.data || raw
  } catch {
    return { title: 'Baita', body: event.data.text() }
  }
}

function buildNotificationOptions(
  payload: PushPayload
): ExtendedNotificationOptions {
  const options: ExtendedNotificationOptions = {
    body: payload.body || '',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/badge.png',
    data: {
      url:
        payload.click_action ||
        payload.data?.url ||
        payload.fcmOptions?.link ||
        '/',
      actionUrls: payload.data?.actionUrls || {},
    },
  }

  if (payload.image) options.image = payload.image
  if (payload.tag) options.tag = payload.tag
  if (payload.renotify) options.renotify = payload.renotify
  if (payload.requireInteraction)
    options.requireInteraction = payload.requireInteraction
  if (payload.silent) options.silent = payload.silent
  if (payload.vibrate) options.vibrate = payload.vibrate
  if (payload.timestamp) options.timestamp = payload.timestamp
  if (payload.dir) options.dir = payload.dir
  if (payload.lang) options.lang = payload.lang

  if (payload.actions && Array.isArray(payload.actions)) {
    options.actions = payload.actions.map((a) => ({
      action: a.action,
      title: a.title,
      ...(a.icon && { icon: a.icon }),
    }))
  }

  return options
}

self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(
    (async () => {
      try {
        const payload = parsePushPayload(event)
        const title = payload.title || 'Baita'
        const options = buildNotificationOptions(payload)

        await self.registration.showNotification(title, options)
      } catch {
        await self.registration.showNotification('Baita', {
          body: 'New notification',
          icon: '/logo.png',
          data: { url: '/' },
        })
      }
    })()
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action

  if (action === 'dismiss' || action === 'close') return

  let targetUrl = '/'

  if (action && data.actionUrls?.[action]) {
    targetUrl = data.actionUrls[action]
  } else if (data.url) {
    targetUrl = data.url
  }

  const urlToOpen = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            new URL(client.url).origin === self.location.origin &&
            'focus' in client
          ) {
            if ('navigate' in client) {
              return (client as WindowClient)
                .navigate(urlToOpen)
                .then((c) => c?.focus())
            }
            return (client as WindowClient).focus()
          }
        }
        return self.clients.openWindow(urlToOpen)
      })
  )
})
