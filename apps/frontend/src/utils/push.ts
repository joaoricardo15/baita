const VAPID_PUBLIC_KEY =
  'BM2CDMNWEL_XeDj-iTASTb-Uxl5Yo-M7WCQvBFCNuI5DkH5TBNPupLcnfppxWqi2ViZIyr0NyFFOEcous8hCUNI'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function canUsePushNotifications(): boolean {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)

  if (isIOS) {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    return isStandalone
  }

  return true
}

export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

export function isInstalledPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      VAPID_PUBLIC_KEY
    ) as BufferSource,
  })

  return subscription
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription()
  if (!subscription) return false
  return subscription.unsubscribe()
}

export async function checkSubscriptionHealth(): Promise<PushSubscription | null> {
  const subscription = await getExistingSubscription()

  if (subscription) {
    const currentKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    const subscriptionKey = subscription.options?.applicationServerKey
      ? new Uint8Array(subscription.options.applicationServerKey)
      : null

    if (
      subscriptionKey &&
      currentKey.length === subscriptionKey.length &&
      !currentKey.every((v, i) => v === subscriptionKey[i])
    ) {
      await subscription.unsubscribe()
      return subscribeToPush()
    }

    return subscription
  }

  if (Notification.permission === 'granted') {
    return subscribeToPush()
  }
  return null
}
