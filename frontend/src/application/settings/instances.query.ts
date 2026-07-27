import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { ServarrInstanceDto } from '#domain/settings/servarr-instance'

export const instancesQuery = defineQuery<ServarrInstanceDto[], []>({
  key: () => ['instances'],
  queryFn: (connector) => connector.listInstances(),
})

export function useInstances() {
  return useDomainQuery(instancesQuery, [])
}
