import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { UserMediaAccountDto } from '#domain/watchlist/user-media-account'

export const myMediaAccountsQuery = defineQuery<UserMediaAccountDto[], []>({
  key: () => ['my-media-accounts'],
  queryFn: (connector) => connector.listMyMediaAccounts(),
})

export function useMyMediaAccounts() {
  return useDomainQuery(myMediaAccountsQuery, [])
}
