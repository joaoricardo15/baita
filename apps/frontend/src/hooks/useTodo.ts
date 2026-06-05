import { useContext } from 'react'

import { ITodoTask } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useTodo() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['todo', user?.userId],
    queryFn: () =>
      queries.fetchTodo(user!.userId).then((todo) => todo?.tasks ?? []),
    enabled: !!user,
  })
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: (tasks: ITodoTask[]) =>
      mutations.updateTodo(user!.userId, tasks),
    onMutate: async (tasks) => {
      await queryClient.cancelQueries({ queryKey: ['todo', user?.userId] })
      const previous = queryClient.getQueryData<ITodoTask[]>([
        'todo',
        user?.userId,
      ])
      queryClient.setQueryData(['todo', user?.userId], tasks)
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['todo', user?.userId], context?.previous)
    },
  })
}
