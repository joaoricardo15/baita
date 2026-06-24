import { IFeeling } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useFeelings() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['feelings'],
    queryFn: () => queries.fetchFeelings(),
    enabled: !!user,
  })
}

export function useSaveFeeling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feeling: IFeeling) => {
      if (feeling.feelingId) {
        return mutations.saveFeeling(feeling.feelingId, feeling)
      }
      const feelingId = Date.now().toString()
      return mutations.saveFeeling(feelingId, { ...feeling, feelingId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feelings'] })
      queryClient.invalidateQueries({ queryKey: ['usual-places'] })
    },
  })
}

export function useDeleteFeeling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feelingId: string) => mutations.deleteFeeling(feelingId),
    onMutate: async (feelingId) => {
      await queryClient.cancelQueries({ queryKey: ['feelings'] })
      const previous = queryClient.getQueryData<IFeeling[]>(['feelings'])
      queryClient.setQueryData<IFeeling[]>(['feelings'], (old) =>
        old?.filter((f) => f.feelingId !== feelingId)
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['feelings'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feelings'] })
    },
  })
}
