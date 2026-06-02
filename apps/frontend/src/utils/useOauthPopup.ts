import { useEffect, useRef } from 'react'

export function useOauthPopup(onClose: () => void) {
  const popupRef = useRef<Window | null>(null)
  const timerRef = useRef<number>()

  const open = (url: string) => {
    const width = 800
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2.5
    popupRef.current = window.open(
      url,
      '',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    timerRef.current = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        window.clearInterval(timerRef.current)
        onClose()
      }
    }, 700)
  }

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current)
      popupRef.current?.close()
    }
  }, [])

  return open
}
