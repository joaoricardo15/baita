import { ITaskExecutionInput } from 'src/models/bot/interface'
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const SERVICE_SITE_URL = process.env.SERVICE_SITE_URL || ''

webpush.setVapidDetails(
  'mailto:admin@baita.help',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

interface ISendNotification {
  token: string
  url?: string
  notification: {
    title: string
    body: string
    timestamp?: number
    image?: string
    icon?: string
    actions?: { action: string; title: string }[]
  }
  data?: Record<string, string>
}

export const sendNotification = async (
  taskInput: ITaskExecutionInput<ISendNotification>
) => {
  try {
    const { botId, inputData } = taskInput
    const subscription = JSON.parse(inputData.token) as webpush.PushSubscription

    const payload = JSON.stringify({
      notification: {
        title: inputData.notification.title,
        body: inputData.notification.body,
        icon:
          inputData.notification.icon ||
          inputData.notification.image ||
          `${SERVICE_SITE_URL}/logo.png`,
        badge: `${SERVICE_SITE_URL}/badge.png`,
        image: inputData.notification.image,
        tag: botId,
        renotify: false,
        requireInteraction: true,
        timestamp: inputData.notification.timestamp,
        actions: inputData.notification.actions,
        data: { url: inputData.url || SERVICE_SITE_URL, ...inputData.data },
        fcmOptions: { link: inputData.url || SERVICE_SITE_URL },
      },
    })

    const result = await webpush.sendNotification(subscription, payload, {
      topic: botId,
      urgency: 'high',
    })

    return { statusCode: result.statusCode, body: result.body }
  } catch (err: unknown) {
    throw (err as Error).message || err
  }
}
