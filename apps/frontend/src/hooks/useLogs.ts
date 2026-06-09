import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'

import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useLogs(botId: string | undefined) {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['logs', botId],
    queryFn: () => queries.fetchLogs(botId!),
    enabled: !!user && !!botId,
  })
}
