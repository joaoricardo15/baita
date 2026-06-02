import { useContext, useEffect, useRef } from 'react'

import { UserContext } from '@/providers/user'
import ApiRequest from './requests'

export function useOauthPopup(onComplete?: (created: boolean) => void) {
  const { connections, retrieveConnections } = useContext(UserContext)
  const apiRequest = ApiRequest()
  const popupRef = useRef<Window | null>(null)
  const timerRef = useRef<number>()
  const countBeforeRef = useRef(0)

  const open = (url: string) => {
    countBeforeRef.current = connections?.length ?? 0

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
        apiRequest
          .getAppConnections()
          .then((freshConnections) => {
            const created = freshConnections.length > countBeforeRef.current
            onComplete?.(created)
            retrieveConnections()
          })
          .catch(() => {
            onComplete?.(false)
            retrieveConnections()
          })
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
