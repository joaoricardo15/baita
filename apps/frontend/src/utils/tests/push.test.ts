import { vi } from 'vitest'

import { canUsePushNotifications, isInstalledPWA, isIOSDevice } from '../push'

describe('Push notification utilities', () => {
  const originalNavigator = navigator
  const originalWindow = window

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120',
      serviceWorker: { ready: Promise.resolve({}) },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('canUsePushNotifications', () => {
    it('returns false when serviceWorker is not supported', () => {
      vi.stubGlobal('navigator', { userAgent: 'test' })
      expect(canUsePushNotifications()).toBe(false)
    })

    it('returns false when PushManager is not supported', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'test',
        serviceWorker: {},
      })
      expect(canUsePushNotifications()).toBe(false)
    })

    it('returns true on desktop Chrome with serviceWorker and PushManager', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 Chrome/120',
        serviceWorker: {},
      })
      vi.stubGlobal('window', {
        ...originalWindow,
        PushManager: class {},
        matchMedia: () => ({ matches: false }),
      })
      Object.defineProperty(window, 'PushManager', { value: class {} })
      expect(canUsePushNotifications()).toBe(true)
    })

    it('returns false on iOS when not installed as PWA', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit',
        serviceWorker: {},
        standalone: false,
      })
      vi.stubGlobal('window', {
        ...originalWindow,
        PushManager: class {},
        matchMedia: () => ({ matches: false }),
      })
      expect(canUsePushNotifications()).toBe(false)
    })

    it('returns true on iOS when installed as PWA (standalone)', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit',
        serviceWorker: {},
        standalone: true,
      })
      vi.stubGlobal('window', {
        ...originalWindow,
        PushManager: class {},
        matchMedia: () => ({ matches: true }),
      })
      expect(canUsePushNotifications()).toBe(true)
    })
  })

  describe('isIOSDevice', () => {
    it('returns true for iPhone user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit',
      })
      expect(isIOSDevice()).toBe(true)
    })

    it('returns true for iPad user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0) AppleWebKit',
      })
      expect(isIOSDevice()).toBe(true)
    })

    it('returns false for Android user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120',
      })
      expect(isIOSDevice()).toBe(false)
    })

    it('returns false for desktop user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120',
      })
      expect(isIOSDevice()).toBe(false)
    })
  })

  describe('isInstalledPWA', () => {
    it('returns true when display-mode is standalone', () => {
      vi.stubGlobal('window', {
        ...originalWindow,
        matchMedia: (query: string) => ({
          matches: query === '(display-mode: standalone)',
        }),
      })
      expect(isInstalledPWA()).toBe(true)
    })

    it('returns true when navigator.standalone is true (iOS Safari)', () => {
      vi.stubGlobal('navigator', {
        ...originalNavigator,
        standalone: true,
      })
      vi.stubGlobal('window', {
        ...originalWindow,
        matchMedia: () => ({ matches: false }),
      })
      expect(isInstalledPWA()).toBe(true)
    })

    it('returns false in regular browser tab', () => {
      vi.stubGlobal('navigator', {
        ...originalNavigator,
        standalone: undefined,
      })
      vi.stubGlobal('window', {
        ...originalWindow,
        matchMedia: () => ({ matches: false }),
      })
      expect(isInstalledPWA()).toBe(false)
    })
  })

  describe('checkSubscriptionHealth', () => {
    it('returns null when serviceWorker is not available', async () => {
      vi.stubGlobal('navigator', { userAgent: 'test' })
      const { getExistingSubscription } = await import('../push')
      const result = await getExistingSubscription()
      expect(result).toBeNull()
    })
  })

  describe('unsubscribeFromPush', () => {
    it('returns false when no subscription exists', async () => {
      const { unsubscribeFromPush } = await import('../push')
      vi.stubGlobal('navigator', {
        ...originalNavigator,
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: () => Promise.resolve(null),
            },
          }),
        },
      })
      const result = await unsubscribeFromPush()
      expect(result).toBe(false)
    })

    it('calls unsubscribe on existing subscription', async () => {
      const { unsubscribeFromPush } = await import('../push')
      const mockUnsubscribe = vi.fn(() => Promise.resolve(true))
      vi.stubGlobal('navigator', {
        ...originalNavigator,
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: () =>
                Promise.resolve({ unsubscribe: mockUnsubscribe }),
            },
          }),
        },
      })
      const result = await unsubscribeFromPush()
      expect(result).toBe(true)
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
