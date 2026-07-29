import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { InstanceProfileDto } from '#domain/settings/instance-profile'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export const instanceProfilesQuery = defineQuery<InstanceProfileDto[], [ServarrKind]>({
  key: (kind) => ['instance-profiles', kind],
  queryFn: (connector, kind) => connector.listInstanceProfiles(kind),
})

export function useInstanceProfiles(kind: ServarrKind) {
  return useDomainQuery(instanceProfilesQuery, [kind])
}
