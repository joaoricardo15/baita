import { useContext } from 'react'

import { INote } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useNotes() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['notes', user?.userId],
    queryFn: () => queries.fetchNotes(user!.userId),
    enabled: !!user,
  })
}

export function useSaveNote() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: (note: INote) =>
      mutations.createNote(user!.userId, note.noteId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: (noteId: string) => mutations.deleteNote(user!.userId, noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes', user?.userId] })
      const previous = queryClient.getQueryData<INote[]>([
        'notes',
        user?.userId,
      ])
      queryClient.setQueryData<INote[]>(['notes', user?.userId], (old) =>
        old?.filter((n) => n.noteId !== noteId)
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['notes', user?.userId], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
