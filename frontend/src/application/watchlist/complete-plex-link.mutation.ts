import { useQueryClient } from '@tanstack/react-query'
import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { PlexPin, PlexLinkResult } from '#domain/watchlist/user-media-account'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const completePlexLinkMutation = defineMutation<
  Result<PlexLinkResult, ApiError>,
  PlexPin
>({
  mutationFn: (connector, pin) => connector.completePlexLink(pin),
})

export function useCompletePlexLink() {
  const queryClient = useQueryClient()
  return useDomainMutation(completePlexLinkMutation, {
    onSuccess: (result) => {
      if (result.ok && result.value.status === 'linked') {
        void queryClient.invalidateQueries({ queryKey: ['my-media-accounts'] })
      }
    },
  })
}
