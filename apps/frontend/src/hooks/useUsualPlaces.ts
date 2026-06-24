import { IUsualPlace } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'

import { getApiResponse } from '@/api/client'
import { fetchUsualPlaces } from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useUsualPlaces() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['usual-places'],
    queryFn: fetchUsualPlaces,
    enabled: !!user,
  })
}

export function useCreateUsualPlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      placeId,
      data,
    }: {
      placeId: string
      data: Partial<IUsualPlace>
    }) => getApiResponse('put', `data/usual-place/${placeId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usual-places'] })
    },
  })
}

export function useDeleteUsualPlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (placeId: string) =>
      getApiResponse('delete', `data/usual-place/${placeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usual-places'] })
    },
  })
}

export function useUpdateUsualPlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      placeId,
      data,
    }: {
      placeId: string
      data: Partial<IUsualPlace>
    }) => getApiResponse('patch', `data/usual-place/${placeId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usual-places'] })
    },
  })
}
