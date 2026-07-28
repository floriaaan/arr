import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { UserRole } from '#domain/identity/user'
import type { UserAccount } from '#domain/identity/user-account'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface SetUserRoleVariables {
  userId: string
  role: UserRole
}

export const setUserRoleMutation = defineMutation<
  Result<{ user: UserAccount }, ApiError>,
  SetUserRoleVariables
>({
  mutationFn: (connector, { userId, role }) => connector.setUserRole(userId, role),
})

export function useSetUserRole() {
  return useDomainMutation(setUserRoleMutation)
}
