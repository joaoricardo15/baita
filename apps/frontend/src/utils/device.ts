export function isIOSDevice(): boolean {
  const ua = navigator.userAgent
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  const isIPadOS =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isClassicIOS || isIPadOS
}

export function isInstalledPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}
