import { useContext, useEffect, useRef } from 'react'

import { IAppConnection } from '@baita/shared'
import { useQueryClient } from '@tanstack/react-query'

import { fetchConnections } from '@/api/queries'
import { useConnections } from '@/hooks/useConnections'
import { AuthContext } from '@/providers/auth'

export function useOauthPopup(onComplete?: (created: boolean) => void) {
  const { user } = useContext(AuthContext)
  const { data: connections } = useConnections()
  const queryClient = useQueryClient()
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
        fetchConnections(user!.userId)
          .then((freshConnections: IAppConnection[]) => {
            const created = freshConnections.length > countBeforeRef.current
            onComplete?.(created)
            queryClient.invalidateQueries({ queryKey: ['connections'] })
          })
          .catch(() => {
            onComplete?.(false)
            queryClient.invalidateQueries({ queryKey: ['connections'] })
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
