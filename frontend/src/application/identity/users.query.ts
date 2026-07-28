import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { UserAccount } from '#domain/identity/user-account'

export const usersQuery = defineQuery<UserAccount[], []>({
  key: () => ['users'],
  queryFn: (connector) => connector.listUsers(),
})

export function useUsers() {
  return useDomainQuery(usersQuery, [])
}
