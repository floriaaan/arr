import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const startOidcSignInMutation = defineMutation<Result<{ url: string }, ApiError>, string>({
  mutationFn: (connector, callbackUrl) => connector.startOidcSignIn(callbackUrl),
})

export function useStartOidcSignIn() {
  return useDomainMutation(startOidcSignInMutation)
}
