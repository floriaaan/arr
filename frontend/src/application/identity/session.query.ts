import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { Session } from '#domain/identity/session'

export const sessionQuery = defineQuery<Session, []>({
  key: () => ['session'],
  queryFn: (connector) => connector.getSession(),
})

export function useSession() {
  return useDomainQuery(sessionQuery, [])
}
