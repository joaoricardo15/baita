import { ITodoTask } from '@baita/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { AuthContext } from '@/providers/auth'

export function useTodo() {
  const { user } = useContext(AuthContext)
  return useQuery({
    queryKey: ['todo'],
    queryFn: () => queries.fetchTodo().then((todo) => todo?.tasks ?? []),
    enabled: !!user,
  })
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tasks: ITodoTask[]) => mutations.updateTodo(tasks),
    onMutate: async (tasks) => {
      await queryClient.cancelQueries({ queryKey: ['todo'] })
      const previous = queryClient.getQueryData<ITodoTask[]>(['todo'])
      queryClient.setQueryData(['todo'], tasks)
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['todo'], context?.previous)
    },
  })
}
