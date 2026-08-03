import { useQueryClient } from '@tanstack/react-query'
import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { UserMediaAccountDto } from '#domain/watchlist/user-media-account'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface SetWatchlistAccountEnabledVariables {
  id: string
  enabled: boolean
}

export const setWatchlistAccountEnabledMutation = defineMutation<
  Result<UserMediaAccountDto, ApiError>,
  SetWatchlistAccountEnabledVariables
>({
  mutationFn: (connector, { id, enabled }) => connector.setWatchlistAccountEnabled(id, enabled),
})

export function useSetWatchlistAccountEnabled() {
  const queryClient = useQueryClient()
  return useDomainMutation(setWatchlistAccountEnabledMutation, {
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: ['my-media-accounts'] })
    },
  })
}
