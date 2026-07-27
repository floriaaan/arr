import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'

export const ssoQuery = defineQuery({
  key: () => ['sso'],
  queryFn: (connector) => connector.getSso(),
})

export function useSso() {
  return useDomainQuery(ssoQuery, [])
}
