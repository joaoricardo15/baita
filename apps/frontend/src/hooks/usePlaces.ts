import { useContext } from 'react'

import { IPlace } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function usePlaces() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['places', user?.userId],
    queryFn: () => queries.fetchPlaces(user!.userId),
    enabled: !!user,
  })
}

export function useSavePlace() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: (place: IPlace) =>
      place.placeId
        ? mutations.updatePlace(user!.userId, place.placeId, place)
        : mutations.createPlace(user!.userId, Date.now().toString(), place),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] })
    },
  })
}

export function useDeletePlace() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: (placeId: string) =>
      mutations.deletePlace(user!.userId, placeId),
    onMutate: async (placeId) => {
      await queryClient.cancelQueries({ queryKey: ['places', user?.userId] })
      const previous = queryClient.getQueryData<IPlace[]>([
        'places',
        user?.userId,
      ])
      queryClient.setQueryData<IPlace[]>(['places', user?.userId], (old) =>
        old?.filter((p) => p.placeId !== placeId)
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['places', user?.userId], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] })
    },
  })
}
