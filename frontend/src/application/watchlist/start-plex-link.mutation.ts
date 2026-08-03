import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { PlexLinkStart } from '#domain/watchlist/user-media-account'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const startPlexLinkMutation = defineMutation<Result<PlexLinkStart, ApiError>, void>({
  mutationFn: (connector) => connector.startPlexLink(),
})

export function useStartPlexLink() {
  return useDomainMutation(startPlexLinkMutation)
}
