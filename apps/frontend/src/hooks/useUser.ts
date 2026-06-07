import { useMutation } from '@tanstack/react-query'

import * as mutations from '@/api/mutations'

export function useDeleteUser() {
  return useMutation({
    mutationFn: () => mutations.deleteUser(),
  })
}
