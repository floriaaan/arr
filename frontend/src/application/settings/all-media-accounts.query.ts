import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { UserMediaAccountAdminDto } from '#domain/watchlist/user-media-account'

export const allMediaAccountsQuery = defineQuery<UserMediaAccountAdminDto[], []>({
  key: () => ['all-media-accounts'],
  queryFn: (connector) => connector.listAllMediaAccounts(),
})

export function useAllMediaAccounts() {
  return useDomainQuery(allMediaAccountsQuery, [])
}
