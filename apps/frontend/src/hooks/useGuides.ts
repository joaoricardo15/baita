import { IGuide } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useGuides() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['guides'],
    queryFn: () => queries.fetchGuides(),
    enabled: !!user,
  })
}

export function useSaveGuide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (guide: IGuide) => {
      if (guide.guideId) {
        return mutations.saveGuide(guide.guideId, guide)
      }
      const guideId = crypto.randomUUID()
      return mutations.saveGuide(guideId, { ...guide, guideId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] })
    },
  })
}

export function useDeleteGuide() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (guideId: string) => mutations.deleteGuide(guideId),
    onMutate: async (guideId) => {
      await queryClient.cancelQueries({ queryKey: ['guides'] })
      const previous = queryClient.getQueryData<IGuide[]>(['guides'])
      queryClient.setQueryData<IGuide[]>(['guides'], (old) =>
        old?.filter((g) => g.guideId !== guideId)
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['guides'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] })
    },
  })
}
