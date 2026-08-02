import { useQueryClient } from '@tanstack/react-query'
import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { MediaRequest } from '#domain/requests/media-request'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface RejectRequestVariables {
  id: string
  reason: string
}

export const rejectRequestMutation = defineMutation<
  Result<MediaRequest, ApiError>,
  RejectRequestVariables
>({
  mutationFn: (connector, { id, reason }) => connector.rejectRequest(id, reason),
})

export function useRejectRequest() {
  const queryClient = useQueryClient()
  return useDomainMutation(rejectRequestMutation, {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['requests'] }),
  })
}
