import { useContext } from 'react'

import { useQuery } from '@tanstack/react-query'

import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useLogs(botId: string | undefined) {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['logs', user?.userId, botId],
    queryFn: () => queries.fetchLogs(user!.userId, botId!),
    enabled: !!user && !!botId,
  })
}
