import { IPlace } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'

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
        : mutations.createPlace(
            btoa(`${place.position.lat}:${place.position.lng}`),
            {
              ...place,
              placeId: btoa(`${place.position.lat}:${place.position.lng}`),
            }
          ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] })
    },
  })
}

export function useDeletePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (place: IPlace) => {
      await Promise.all(
        place.pictures.map((pictureId) => mutations.removeImage(pictureId))
      )
      await mutations.deletePlace(place.placeId)
    },
    onMutate: async (place) => {
      await queryClient.cancelQueries({ queryKey: ['places'] })
      const previous = queryClient.getQueryData<IPlace[]>(['places'])
      queryClient.setQueryData<IPlace[]>(['places'], (old) =>
        old?.filter((p) => p.placeId !== place.placeId)
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
