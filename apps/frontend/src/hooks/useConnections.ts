import { IConnection } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useConnections() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => queries.fetchConnections(),
    enabled: !!user,
  })
}

export function useConnectionHealth(connectionId: string) {
  return useMutation({
    mutationFn: () => queries.fetchConnectionHealth(connectionId),
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      connectorId,
      apiKey,
    }: {
      connectorId: string
      apiKey: string
    }) => mutations.createConnection(connectorId, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) =>
      mutations.deleteConnection(connectionId),
    onMutate: async (connectionId) => {
      await queryClient.cancelQueries({ queryKey: ['connections'] })
      const previous = queryClient.getQueryData<IConnection[]>(['connections'])
      queryClient.setQueryData<IConnection[]>(['connections'], (old) =>
        old?.filter((c) => String(c.connectionId) !== String(connectionId))
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['connections'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}
