import { useContext } from 'react'

import { IPlace } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function usePlaces() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['places'],
    queryFn: () => queries.fetchPlaces(),
    enabled: !!user,
  })
}

export function useSavePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (place: IPlace) =>
      place.placeId
        ? mutations.updatePlace(place.placeId, place)
        : mutations.createPlace(Date.now().toString(), place),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] })
    },
  })
}

export function useDeletePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (placeId: string) => mutations.deletePlace(placeId),
    onMutate: async (placeId) => {
      await queryClient.cancelQueries({ queryKey: ['places'] })
      const previous = queryClient.getQueryData<IPlace[]>(['places'])
      queryClient.setQueryData<IPlace[]>(['places'], (old) =>
        old?.filter((p) => p.placeId !== placeId)
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['places'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] })
    },
  })
}
