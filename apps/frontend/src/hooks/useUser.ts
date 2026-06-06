import { useContext } from 'react'

import { useMutation } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'
import { AuthContext } from '@/providers/auth'

export function useDeleteUser() {
  const { user } = useContext(AuthContext)
  return useMutation({
    mutationFn: () => mutations.deleteUser(user!.userId),
  })
}
