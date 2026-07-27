import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface CreateAdminVariables {
  email: string
  password: string
}

export const createAdminMutation = defineMutation<
  Result<{ userId: string }, ApiError>,
  CreateAdminVariables
>({
  mutationFn: (connector, { email, password }) => connector.createAdminAccount(email, password),
})

export function useCreateAdmin() {
  return useDomainMutation(createAdminMutation)
}
