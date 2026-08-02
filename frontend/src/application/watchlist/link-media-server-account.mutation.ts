import { useQueryClient } from '@tanstack/react-query'
import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { MediaAccountKind, UserMediaAccountDto } from '#domain/watchlist/user-media-account'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface LinkMediaServerAccountVariables {
  kind: Extract<MediaAccountKind, 'jellyfin' | 'emby'>
  baseUrl: string
  username: string
  password: string
}

export const linkMediaServerAccountMutation = defineMutation<
  Result<UserMediaAccountDto, ApiError>,
  LinkMediaServerAccountVariables
>({
  mutationFn: (connector, { kind, baseUrl, username, password }) =>
    connector.linkMediaServerAccount(kind, baseUrl, username, password),
})

export function useLinkMediaServerAccount() {
  const queryClient = useQueryClient()
  return useDomainMutation(linkMediaServerAccountMutation, {
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: ['my-media-accounts'] })
    },
  })
}
