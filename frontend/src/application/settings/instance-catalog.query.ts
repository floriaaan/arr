import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { InstanceProfiles } from '#domain/interfaces/arr-connector'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const instanceCatalogQuery = defineQuery<
  Result<InstanceProfiles, ApiError>,
  [ServarrKind]
>({
  key: (kind) => ['instance-catalog', kind],
  queryFn: (connector, kind) => connector.fetchStoredInstanceProfiles(kind),
})

export function useInstanceCatalog(kind: ServarrKind, enabled: boolean) {
  return useDomainQuery(instanceCatalogQuery, [kind], { enabled })
}
