import { useContext } from 'react'

import { IAppConnection } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useConnections() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['connections', user?.userId],
    queryFn: () => queries.fetchConnections(user!.userId),
    enabled: !!user,
  })
}

export function useConnectionHealth(connectionId: string) {
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: () => queries.fetchConnectionHealth(user!.userId, connectionId),
  })
}

export function useConnectionDetails(connectionId: string) {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['connectionDetails', user?.userId, connectionId],
    queryFn: () => queries.fetchConnectionDetails(user!.userId, connectionId),
    enabled: !!user && !!connectionId,
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: ({
      connectorId,
      apiKey,
    }: {
      connectorId: string
      apiKey: string
    }) => mutations.createConnection(user!.userId, connectorId, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: (connectionId: string) =>
      mutations.deleteConnection(user!.userId, connectionId),
    onMutate: async (connectionId) => {
      await queryClient.cancelQueries({
        queryKey: ['connections', user?.userId],
      })
      const previous = queryClient.getQueryData<IAppConnection[]>([
        'connections',
        user?.userId,
      ])
      queryClient.setQueryData<IAppConnection[]>(
        ['connections', user?.userId],
        (old) =>
          old?.filter((c) => String(c.connectionId) !== String(connectionId))
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['connections', user?.userId], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}
