import { useQueryClient } from '@tanstack/react-query'
import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { MediaRequest } from '#domain/requests/media-request'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const cancelRequestMutation = defineMutation<Result<MediaRequest, ApiError>, string>({
  mutationFn: (connector, id) => connector.cancelRequest(id),
})

export function useCancelRequest() {
  const queryClient = useQueryClient()
  return useDomainMutation(cancelRequestMutation, {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['requests'] }),
  })
}
