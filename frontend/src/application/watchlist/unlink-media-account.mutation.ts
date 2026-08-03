import { useQueryClient } from '@tanstack/react-query'
import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const unlinkMediaAccountMutation = defineMutation<Result<void, ApiError>, string>({
  mutationFn: (connector, id) => connector.unlinkMediaAccount(id),
})

export function useUnlinkMediaAccount() {
  const queryClient = useQueryClient()
  return useDomainMutation(unlinkMediaAccountMutation, {
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: ['my-media-accounts'] })
    },
  })
}
