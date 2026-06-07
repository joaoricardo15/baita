import { useContext } from 'react'

import { INote } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useNotes() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['notes'],
    queryFn: () => queries.fetchNotes(),
    enabled: !!user,
  })
}

export function useSaveNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: INote) => mutations.createNote(note.noteId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => mutations.deleteNote(noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previous = queryClient.getQueryData<INote[]>(['notes'])
      queryClient.setQueryData<INote[]>(['notes'], (old) =>
        old?.filter((n) => n.noteId !== noteId)
      )
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['notes'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
