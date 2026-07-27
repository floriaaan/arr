import type { UseMutationOptions } from '@tanstack/react-query'
import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { AuthenticatedUser } from '#domain/identity/user'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface SignInVariables {
  email: string
  password: string
}

export const signInMutation = defineMutation<Result<AuthenticatedUser, ApiError>, SignInVariables>({
  mutationFn: (connector, { email, password }) => connector.signInWithPassword(email, password),
})

export function useSignIn(
  options?: Omit<
    UseMutationOptions<Result<AuthenticatedUser, ApiError>, Error, SignInVariables>,
    'mutationFn'
  >,
) {
  return useDomainMutation(signInMutation, options)
}
