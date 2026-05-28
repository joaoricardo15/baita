import admin from 'firebase-admin'
import { TokenMessage } from 'firebase-admin/lib/messaging/messaging-api'
import { ITaskExecutionInput } from 'src/models/bot/interface'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')

const SERVICE_SITE_URL = process.env.SERVICE_SITE_URL || ''

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
})

interface ISendNotification {
  token: string
  url?: string
  notification: {
    title: string
    body: string
    timestamp?: number
    image?: string
    icon?: string
    actions?: {
      action: string
      title: string
    }[]
  }
  data?: Record<string, string>
}

export const sendNotification = async (
  taskInput: ITaskExecutionInput<ISendNotification>
) => {
  try {
    const { botId, inputData } = taskInput

    const message: TokenMessage = {
      data: inputData.data,
      token: inputData.token,
      webpush: {
        headers: {
          Topic: botId,
          Urgency: 'high',
        },
        notification: {
          tag: botId,
          silent: false,
          renotify: false,
          requireInteraction: true,
          badge: `${SERVICE_SITE_URL}/badge.png`,
          ...inputData.notification,
          icon:
            inputData.notification.icon ||
            inputData.notification.image ||
            `${SERVICE_SITE_URL}/logo.png`,
        },
        fcmOptions: {
          link: inputData.url || SERVICE_SITE_URL,
        },
      },
      fcmOptions: {
        analyticsLabel: botId,
      },
    }

    return await admin.messaging().send(message)
  } catch (err: unknown) {
    throw (err as Error).message || err
  }
}
