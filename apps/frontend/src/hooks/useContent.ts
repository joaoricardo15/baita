import { useContext } from 'react'

import { IContent } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useContent() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['content', user?.userId],
    queryFn: () => queries.fetchContent(user!.userId),
    enabled: !!user,
  })
}

export function usePopContent() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)

  return (onLow?: () => void) => {
    queryClient.setQueryData<IContent[]>(['content', user?.userId], (prev) => {
      if (!prev || prev.length === 0) return prev
      const updated = prev.slice(0, -1)
      if (updated.length <= 3 && onLow) onLow()
      return updated
    })
  }
}

export function useRefreshContent() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)

  return useMutation({
    mutationFn: () => queries.fetchContent(user!.userId),
    onSuccess: (newContent) => {
      queryClient.setQueryData<IContent[]>(['content', user?.userId], (prev) =>
        !prev ? newContent : [...newContent, ...prev]
      )
    },
  })
}

export function useReactToContent() {
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: ({
      content,
      reaction,
    }: {
      content: IContent
      reaction: string
    }) => mutations.reactToContent(user!.userId, content, reaction),
  })
}
