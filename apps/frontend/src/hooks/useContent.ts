import { useContext } from 'react'

import { IContent } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useContent() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['content'],
    queryFn: () => queries.fetchContent(),
    enabled: !!user,
  })
}

export function usePopContent() {
  const queryClient = useQueryClient()

  return (onLow?: () => void) => {
    queryClient.setQueryData<IContent[]>(['content'], (prev) => {
      if (!prev || prev.length === 0) return prev
      const updated = prev.slice(0, -1)
      if (updated.length <= 3 && onLow) onLow()
      return updated
    })
  }
}

export function useRefreshContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => queries.fetchContent(),
    onSuccess: (newContent) => {
      queryClient.setQueryData<IContent[]>(['content'], (prev) =>
        !prev ? newContent : [...newContent, ...prev]
      )
    },
  })
}

export function useReactToContent() {
  return useMutation({
    mutationFn: ({
      content,
      reaction,
    }: {
      content: IContent
      reaction: string
    }) => mutations.reactToContent(content, reaction),
  })
}
